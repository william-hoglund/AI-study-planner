// Server.js — Express backend (ESM, komplett, omskriven)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ical from 'node-ical'; // kalendertolk
import authRoutes from './routes/authRoutes.js';
import planRoutes from './routes/planRoutes.js';

/* ===================== Polyfills & konfig ===================== */
// Polyfill fetch om Node < 18
if (typeof fetch === 'undefined') {
  const { default: nodeFetch } = await import('node-fetch');
  global.fetch = (...args) => nodeFetch(...args);
}

const app = express();
const TZ = 'Europe/Stockholm';
const LOCALE = 'sv-SE';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const PORT = process.env.PORT || 3001;

// CORS från .env (kommaseparerad lista)
const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: allowed, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Mount auth + plan routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);

/* ===================== Små helpers ===================== */
const CLIP = (s = '', max = 4000) => (s.length > max ? s.slice(0, max) + '…' : s);

function fetchWithTimeout(resource, options = {}) {
  const { timeout = 12000, ...rest } = options; // 12s
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id));
}

function toISO(d) {
  try { return new Date(d).toISOString(); } catch { return null; }
}

function isOverlap(a, b) {
  return new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);
}

/* ===================== ICS exporter (för /api/export/ics) ===================== */
function buildIcs(events = [], name = 'AI Study Plan') {
  const pad = n => String(n).padStart(2, '0');
  const toIcs = (date) => {
    const d = new Date(date);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  const esc = (s) => String(s ?? '').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(name)}`,
    'PRODID:-//ai-study-planner//EN'
  ];

  events.forEach((e, i) => {
    const title = e.title || e.label || 'Studiepass';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${Date.now()}-${i}@ai-study-planner`);
    lines.push(`DTSTAMP:${toIcs(new Date())}`);
    lines.push(`DTSTART:${toIcs(e.start)}`);
    lines.push(`DTEND:${toIcs(e.end)}`);
    lines.push(`SUMMARY:${esc(title)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* ===================== Kalender: parse ICS ===================== */
async function parseCalendar({ icsText = '', icsUrl = '' }) {
  if (!icsText && !icsUrl) return [];
  let raw = icsText;
  if (!raw && icsUrl) {
    const r = await fetchWithTimeout(icsUrl, { timeout: 12000 });
    if (!r.ok) throw new Error('Kunde inte hämta ICS‑länken');
    raw = await r.text();
  }
  const data = ical.sync.parseICS(raw);
  const evs = Object.values(data)
    .filter(v => v?.type === 'VEVENT')
    .map(v => ({
      id: v.uid || `${v.summary}-${v.start?.toISOString?.() || ''}`,
      title: v.summary || 'Händelse',
      start: toISO(v.start),
      end: toISO(v.end),
      location: v.location || '',
      description: v.description || ''
    }))
    .filter(e => e.start && e.end)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  return evs;
}

/* ===================== Prompt-bitar för /api/plan ===================== */
const TECH_PROFILES = {
  pomodoro25: 'Block 25 min, paus 5 min. 4 block → lång paus 20–30 min.',
  pomodoro50: 'Block 50 min, paus 10 min. 2–3 block → lång paus 30 min.',
  deepwork:   'Block 90 min fokuserat arbete, paus 15 min. Max 2–3 block/dag.',
  timeblock:  '60-minutersblock med 10 min buffert mellan block.',
  spaced:     'Korta repetitionspass (30/5) utspritt flera gånger/dag.',
  recall:     'Aktiv återkallelse i 30/5‑cykler, blandade ämnen.'
};

// Extract a subject and optional course code from strings
function parseSubjectParts(...candidates) {
  const text = candidates.filter(Boolean).join(' \n ').trim();
  if (!text) return { subject: '', code: '' };
  // common course code patterns like AB123, ABC1234, TSEA12, etc.
  const codeMatch = text.match(/\b([A-ZÅÄÖ]{2,5}\d{2,4})\b/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : '';

  // subject: try to take phrase before/after code, else first line before dash/colon
  let subject = '';
  if (code) {
    const parts = text.split(codeMatch[0]);
    // prefer left part words (trim separators)
    subject = (parts[0] || parts[1] || '').split(/[\n\-:|•]/)[0].trim();
  }
  if (!subject) {
    subject = text.split(/[\n\-:|•]/)[0].trim();
  }
  // keep it reasonable length
  subject = subject.replace(/\s+/g, ' ').slice(0, 80);
  return { subject, code };
}

function subjectFromEvent(ev) {
  const { subject, code } = parseSubjectParts(ev?.title, ev?.description, ev?.location);
  return { subject: subject || (ev?.title || '').slice(0, 80), code };
}

function collectSubjects(events = []) {
  const map = new Map();
  for (const ev of events) {
    const { subject, code } = subjectFromEvent(ev);
    if (!subject) continue;
    if (!map.has(subject)) map.set(subject, code || '');
  }
  return Array.from(map, ([subject, code]) => ({ subject, code }));
}

function summarizeEventsForModel(events = [], { max = 80 } = {}) {
  const rows = events.slice(0, max).map(ev => {
    const s = new Date(ev.start).toLocaleString(LOCALE, { timeZone: TZ });
    const e = new Date(ev.end).toLocaleString(LOCALE, { timeZone: TZ });
    const title = (ev.title || 'Händelse').slice(0, 80);
    const loc = ev.location ? ` @ ${ev.location.slice(0, 60)}` : '';
    return `• ${title} | ${s}–${e}${loc}`;
  });
  return rows.join('\n');
}

function planningRules({ studyTechnique, view, date }) {
  return [
    `Språk: svenska. Tidszon: ${TZ}.`,
    `Vy: ${view}${view === 'daily' && date ? ` (${date})` : ''}.`,
    `Studieteknik: ${studyTechnique}. ${TECH_PROFILES[studyTechnique] || ''}`,
    `Hårda regler: inga överlapp; respektera kalenderhändelser; minst 5 min paus mellan pass.`,
    `Mjuka regler: minimera ändringar vid omgenerering; jämn belastning över veckan.`,
    `Föredra dagsljus; undvik sena kvällar om användaren bett om det.`,
    `Gör inga spekulationer; lämna luckor om information saknas.`,
    `VIKTIGT: Skapa INGA nya ämnen/kurser. Använd ENDAST de ämnen/kurser som finns i användarens kalender (se listan 'ÄMNEN' nedan) och behåll deras namn/koder.`,
    `VIKTIGT: Varje ämne/kurs i listan 'ÄMNEN' ska förekomma MINST en gång i 'structured'. Om ingen tid kan schemaläggas, lägg in ett placeholder-pass med title 'Unscheduled: <Ämne (KOD)>'.`,
    `VIKTIGT: Inkludera ämnesnamn + ev. kurskod i varje pass via 'extendedProps.subject' och 'extendedProps.code'. Titel får gärna börja med ämnesnamnet.`,
  ].join('\n');
}

function outputJsonSchemaHelp() {
  return `
Returnera ENBART JSON enligt detta schema (ingen markdown, ingen text före/efter):
{
  "plan_text": "kort, läsbar sammanfattning (max 200 ord)",
  "structured": [
    {
      "title": "<Ämnesnamn (KOD)> – beskrivning",
      "start": "2025-09-10T09:00:00+02:00",
      "end": "2025-09-10T10:30:00+02:00",
      "technique": "pomodoro25 | pomodoro50 | deepwork | timeblock | spaced | recall",
      "notes": "frivilligt",
      "extendedProps": { "subject": "EXAKT ämnesnamn från listan ÄMNEN", "code": "EXAKT kurskod från listan (om finns)" }
    }
  ],
  "usedAI": true,
  "eventsCount": 123
}
- Inga överlapp i "structured".
- Minst 5 min paus mellan pass samma dag.
- Lägg inte pass på tider som krockar med kalendrar ovan.
- Skapa INGA nya ämnen/kurser. Använd ENDAST de som finns i listan 'ÄMNEN' nedan och behåll deras namn/koder.
- Varje ämne/kurs i listan 'ÄMNEN' måste förekomma minst en gång. Om ingen tid finns: inkludera ett placeholder-pass med title 'Unscheduled: <Ämne (KOD)>' och valfri kort notes.
`.trim();
}

function buildPlanMessages({
  preferences,
  studyTechnique = 'pomodoro25',
  view = 'weekly',
  date = null,
  events = [],
  subjects = [],
  previousPlan = '',
  refinementHints = {},
  usedAI = true,
}) {
  const sys = [
    `Du är en planeringsmotor för studenters studiescheman.`,
    `Svara alltid på svenska.`,
    `Svara endast med JSON enligt schema.`
  ].join(' ');

  const subjectsList = subjects.length
    ? subjects.map(s => `- ${s.subject}${s.code ? ' (' + s.code + ')' : ''}`).join('\n')
    : '(inga ämnen)';

  const user = [
    `ANVÄNDARENS PREFERENSER:`,
    CLIP(preferences, 1500) || '(tomt)',
    ``,
    `KALENDER (sammandrag):`,
    summarizeEventsForModel(events, { max: 80 }) || '(tom kalender)',
    ``,
    `ÄMNEN (från kalendern, använd EXAKT dessa namn/koder; skapa inget nytt):`,
    subjectsList,
    ``,
    `REGLER:`,
    planningRules({ studyTechnique, view, date }),
    ``,
    `OUTPUTFORMAT:`,
    outputJsonSchemaHelp()
  ].join('\n');

  const assist = previousPlan
    ? `Föregående plan (sammandrag):\n${CLIP(previousPlan, 1000)}\n\nRefine-hints: ${JSON.stringify(refinementHints)}`
    : null;

  const messages = [
    { role: 'system', content: sys },
    assist ? { role: 'assistant', content: assist } : null,
    { role: 'user', content: user },
  ].filter(Boolean);

  const extra = { usedAI, eventsCount: events?.length || 0 };
  return { messages, extra };
}

/* ===================== Healthcheck ===================== */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'schedule-optimizer', ts: new Date().toISOString() });
});

/* ===================== /api/ai-suggest ===================== */
/**
 * Body: { preferences, icsText?, icsUrl?, studyTechnique, view, date? }
 * Res:  { ok: true, suggestion } | { error }
 */
app.post('/api/ai-suggest', async (req, res) => {
  try {
    const {
      preferences = '',
      icsText = '',
      icsUrl = '',
      studyTechnique = '',
      view = 'weekly',
      date = null,
    } = req.body || {};

    if (!preferences.trim()) {
      return res.status(400).json({ error: 'Skriv preferenser först.' });
    }

    const baseContext =
`Preferenser:
${CLIP(preferences, 1500)}

Källa: ${icsText ? 'ICS-text bifogad' : (icsUrl ? icsUrl : 'saknas')}
Teknik: ${studyTechnique}
Vy: ${view}${view === 'daily' && date ? ` (${date})` : ''}`;

    if (OPENAI_API_KEY) {
      const prompt =
`Du är en professionell AI-studieplanerare som skapar personliga, optimerade studiescheman.
Uppgift:
- Läs användarens preferenser och kontext nedan.
- Föreslå 3–5 korta, konkreta förbättringar (punktlista) som stärker planen.
- Max 80 ord. Svara på svenska.

${baseContext}`;

      const r = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
        timeout: 10000,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Du skriver koncisa förbättringsförslag på svenska.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 220,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.error?.message || 'OpenAI-svar misslyckades';
        return res.status(502).json({ error: msg });
      }
      const suggestion = data?.choices?.[0]?.message?.content?.trim();
      if (suggestion) return res.json({ ok: true, suggestion });
      // fallthrough
    }

    // Fallback-heuristik
    const tips = [];
    if (/tent|prov|exam/i.test(preferences)) tips.push('Planera 2× 90-minuters pass per ämne dagligen sista 7 dagarna före tentan.');
    if (/kväll|20:00|sen/i.test(preferences)) tips.push('Lägg tunga pass 09–12; håll eftermiddagar lättare och undvik efter 20:00.');
    if (String(studyTechnique).includes('pomodoro')) tips.push('Kör 4 pomodoros följt av en längre paus (20–30 min) efter block.');
    if (!tips.length) tips.push('Inför daglig snabb repetition (15 min) i slutet av dagen för att förstärka minnet.');
    return res.json({ ok: true, suggestion: `- ${tips.join('\n- ')}` });
  } catch (e) {
    console.error('/api/ai-suggest error:', e);
    return res.status(500).json({ error: 'Kunde inte ta fram AI‑förslag.' });
  }
});

/* ===================== /api/plan ===================== */
/**
 * Body: {
 *   preferences, studyTechnique, view, date?, useAI,
 *   previousPlan?, previousStructured?, refine?, refinementHints?,
 *   icsText?, icsUrl?, locks? (låsta block från UI)
 * }
 * Res: { ok, plan, structured, usedAI, eventsCount } | { error }
 */
app.post('/api/plan', async (req, res) => {
  try {
    const {
      preferences = '',
      studyTechnique = 'pomodoro25',
      view = 'weekly',
      date = null,
      useAI = true,
      previousPlan = '',
      previousStructured = [],
      refine = false,
      refinementHints = {},
      icsText = '',
      icsUrl = '',
      locks = [] // [{title,start,end}]
    } = req.body || {};

    // 1) Hämta kalendern
    const events = await parseCalendar({ icsText, icsUrl });

    // Subject inventory from calendar
    const subjects = collectSubjects(events);

    // 2) bygg prompt
    const { messages, extra } = buildPlanMessages({
      preferences,
      studyTechnique,
      view,
      date,
      events,
      subjects,
      previousPlan: refine ? previousPlan : '',
      refinementHints: refine ? refinementHints : {},
      usedAI: !!useAI,
    });

    // 3) Ingen API‑nyckel / AI avstängd → fallback
    if (!OPENAI_API_KEY || !useAI) {
      const planText = 'Förenklad plan utan AI: fokusera förmiddagar, lägg 25/5‑pass, undvik sena kvällar.';
      // Minimalt exempel: konvertera låsta block + några “studieblock” runt första kalenderhändelserna
      const base = [...(Array.isArray(locks) ? locks : [])]
        .filter(x => x?.start && x?.end)
        .map((x, i) => ({
          title: x.title || `Låst block ${i+1}`,
          start: toISO(x.start),
          end: toISO(x.end),
          technique: studyTechnique,
          notes: 'Låst av användaren'
        }))
        .filter(x => x.start && x.end);

      const extras = events.slice(0, Math.max(0, 5 - base.length)).map((ev, i) => ({
        title: `Studieblock ${i + 1}: ${ev.title}`,
        start: ev.start,
        end: ev.end,
        technique: studyTechnique,
        notes: 'Minst 5 min paus innan/efter.'
      }));

      const structured = [...base, ...extras].sort((a, b) => new Date(a.start) - new Date(b.start));
      return res.json({ ok: true, plan: planText, structured, usedAI: false, eventsCount: events.length });
    }

    // 4) Anropa OpenAI (kräv strikt JSON)
    const r = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      timeout: 20000,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' } // strikt JSON
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = data?.error?.message || 'OpenAI-svar misslyckades';
      return res.status(502).json({ error: msg });
    }

    let parsed = {};
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    } catch {
      return res.status(502).json({ error: 'Ogiltigt JSON-svar från modellen' });
    }

    const plan = String(parsed.plan_text || '').trim();
    const structuredRaw = Array.isArray(parsed.structured) ? parsed.structured : [];
    const metaUsedAI = !!parsed.usedAI;
    const metaEventsCount = Number.isFinite(parsed.eventsCount) ? parsed.eventsCount : extra.eventsCount;

    // 5) Post‑validering: normalisera tider, respektera "locks", ta bort överlapp
    const normalized = structuredRaw
      .concat(Array.isArray(locks) ? locks.map(x => ({ ...x, notes: 'Låst av användaren', technique: x.technique || studyTechnique })) : [])
      .map((x, i) => ({
        ...x,
        start: x.start && !isNaN(Date.parse(x.start)) ? x.start : null,
        end: x.end && !isNaN(Date.parse(x.end)) ? x.end : null,
        title: x.title ? String(x.title).slice(0, 140) : `Pass ${i+1}`,
        technique: x.technique || studyTechnique,
        extendedProps: {
          ...(x.extendedProps || {}),
          // try to infer subject if missing
          ...(function(){
            if (x?.extendedProps?.subject) return {};
            const { subject, code } = parseSubjectParts(x?.title, x?.notes);
            return subject ? { subject, code: code || '' } : {};
          })(),
        },
      }))
      .filter(x => x.start && x.end && new Date(x.end) > new Date(x.start))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const cleaned = [];
    for (const item of normalized) {
      const conflict = cleaned.find(prev => isOverlap(prev, item));
      // Om konflikt med låst block => hoppa över icke-låst
      const isLocked = (locks || []).some(l => l.start === item.start && l.end === item.end);
      if (conflict) {
        const conflictLocked = (locks || []).some(l => l.start === conflict.start && l.end === conflict.end);
        if (conflictLocked && !isLocked) continue; // behåll låst, skippa det här
        if (!conflictLocked && isLocked) {
          // ersätt tidigare icke-låst med låst
          const idx = cleaned.indexOf(conflict);
          cleaned.splice(idx, 1, item);
          continue;
        }
        // annars: skippa
        continue;
      }
      cleaned.push(item);
    }

    // Guarantee each calendar subject is present at least once; otherwise add placeholder
    const present = new Set(
      cleaned.map(e => (e?.extendedProps?.subject || '')).filter(Boolean)
    );

    function placeholderStart() {
      // If daily view with a date, place at that date 08:00; else next weekday 08:00
      const base = date ? new Date(date) : new Date();
      const d = new Date(base.getTime());
      if (!date) {
        // move to next day if past 17:00
        if (d.getHours() >= 17) d.setDate(d.getDate() + 1);
        // ensure weekday (Mon-Fri)
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      }
      d.setHours(8, 0, 0, 0);
      return d;
    }

    for (const s of subjects) {
      if (!present.has(s.subject)) {
        const startD = placeholderStart();
        const endD = new Date(startD.getTime() + 30 * 60000);
        cleaned.push({
          title: `Unscheduled: ${s.subject}${s.code ? ' (' + s.code + ')' : ''}`,
          start: startD.toISOString(),
          end: endD.toISOString(),
          technique: studyTechnique,
          notes: 'Plats saknas i nuvarande schema. Dra och släpp till lämplig tid.',
          extendedProps: { subject: s.subject, code: s.code || '', placeholder: true },
        });
      }
    }

    // Sort again after placeholders
    cleaned.sort((a, b) => new Date(a.start) - new Date(b.start));

    return res.json({
      ok: true,
      plan,
      structured: cleaned,
      usedAI: metaUsedAI,
      eventsCount: metaEventsCount,
    });
  } catch (e) {
    console.error('/api/plan error:', e);
    res.status(500).json({ error: e.message || 'Kunde inte skapa plan' });
  }
});

/* ===================== /api/export/ics ===================== */
/**
 * Body: { calendarName?, events:[{ title?, label?, start, end, description? }] }
 * Res:  ICS-fil (attachment)
 */
app.post('/api/export/ics', async (req, res) => {
  try {
    const { events = [], calendarName = 'AI Study Plan' } = req.body || {};
    if (!Array.isArray(events) || !events.length) {
      return res.status(400).json({ error: 'Inga events att exportera' });
    }
    const ics = buildIcs(events, calendarName);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=study-plan.ics');
    res.send(ics);
  } catch (err) {
    console.error('[/api/export/ics] error:', err);
    res.status(400).json({ ok: false, error: err?.message || 'Export misslyckades' });
  }
});

/* ===================== Start ===================== */
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

/*
Snabbguide:
- POST /api/plan
  Body:
  {
    "preferences": "helgledigt, efter 20:00 ledigt, matte prioritet",
    "studyTechnique": "pomodoro25",
    "view": "weekly",
    "date": "2025-08-14", // endast för daily
    "useAI": true,
    "previousPlan": "", "refine": false, "refinementHints": {},
    "icsText": "BEGIN:VCALENDAR... (valfritt)",
    "icsUrl": "https://exempel.se/schedule.ics", // valfritt
    "locks": [{ "title":"Låst pass", "start":"2025-08-15T08:00:00+02:00", "end":"2025-08-15T09:00:00+02:00" }]
  }

- POST /api/ai-suggest
  Body: { "preferences":"...", "icsUrl":"...", "studyTechnique":"pomodoro25", "view":"weekly" }

- POST /api/export/ics
  Body:
  {
    "calendarName": "Study Plan",
    "events": [
      { "title":"Matte – Pomodoro 25/5", "start":"2025-08-15T08:00:00+02:00", "end":"2025-08-15T08:25:00+02:00" }
    ]
  }
*/
