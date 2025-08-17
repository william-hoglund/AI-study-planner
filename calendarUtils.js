import ical from 'node-ical';
import fetch from 'node-fetch';

// -------- Helpers --------
const TZ = 'Europe/Stockholm';

function techniqueToBlockMinutes(tech) {
  switch (tech) {
    case 'pomodoro50': return { work: 50, break: 10, longEvery: 4, longBreak: 20 };
    case 'deepwork':   return { work: 90, break: 15, longEvery: 2, longBreak: 25 };
    case 'timeblock':  return { work: 60, break: 10, longEvery: 3, longBreak: 20 };
    case 'spaced':     return { work: 30, break: 5,  longEvery: 4, longBreak: 15 };
    case 'recall':     return { work: 30, break: 5,  longEvery: 4, longBreak: 15 };
    case 'pomodoro25':
    default:           return { work: 25, break: 5,  longEvery: 4, longBreak: 20 };
  }
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

function timeHM(d) {
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

function label(tech) {
  switch (tech) {
    case 'pomodoro50': return 'Pomodoro 50/10';
    case 'deepwork': return 'Deep Work';
    case 'timeblock': return 'Time Blocking';
    case 'spaced': return 'Spaced Repetition';
    case 'recall': return 'Active Recall';
    case 'pomodoro25':
    default: return 'Pomodoro 25/5';
  }
}

// Extract course code and full name from a subject string
function subjectParts(rawSubject = '') {
  const s = String(rawSubject || '').trim();
  const codeMatch = s.match(/\b([A-ZÅÄÖ]{2,}[A-ZÅÄÖ]*\d{2,})\b/);
  const code = codeMatch ? codeMatch[1] : '';
  let full = code ? s.replace(code, '').replace(/[\-–|]+/g, ' ').trim() : s;
  full = full.replace(/\s{2,}/g, ' ').trim();
  if (!full) full = s || 'Allmänt';
  return { full, code };
}

// Basic classifier for imported event summary -> type + subject
// Subject display: remove type prefixes and build clean "Full – CODE" when possible
function parseSubjectDisplay(summaryRaw = '') {
  let s = String(summaryRaw || '').trim();
  // strip leading type keywords + separators (sv/en common abbreviations)
  s = s.replace(/^(förel(?:äsning)?|förel\.?|seminar(?:ium)?|semin\.?|övning|lab(?:oration)?|examination|tenta|exam|lecture|seminar|exercise|meeting|möte|grupp|deadline|inlämning)\s*[:|\-–—]?\s*/i, '');
  // Remove leading punctuation/spaces
  s = s.replace(/^[\s,;:\-–—|]+/, '').trim();
  // Try to detect course code
  const codeMatch = s.match(/\b([A-ZÅÄÖ]{2,}[A-ZÅÄÖ]*\d{2,})\b/);
  const code = codeMatch ? codeMatch[1] : '';
  let name = code ? s.replace(code, '').replace(/[\-–—|]+/g, ' ').trim() : s;
  name = name.replace(/\s{2,}/g, ' ').trim();
  // Swap order if common format "CODE – Name"
  if (!name || /^[-–—|]*$/.test(name)) name = s;
  return code ? `${name} – ${code}` : (name || 'Allmänt');
}

function classifyEvent(summaryRaw = '') {
  const s = String(summaryRaw || '').trim();
  const lower = s.toLowerCase();
  const typeKeywords = [
    { key: 'lecture', type: 'Föreläsning' },
    { key: 'föreläs', type: 'Föreläsning' },
    { key: 'seminar', type: 'Seminarium' },
    { key: 'övning', type: 'Övning' },
    { key: 'lab', type: 'Laboration' },
    { key: 'examination', type: 'Tenta' },
    { key: 'tenta', type: 'Tenta' },
    { key: 'exam', type: 'Tenta' },
    { key: 'deadline', type: 'Deadline' },
    { key: 'hand-in', type: 'Deadline' },
    { key: 'assignment', type: 'Inlämning' },
    { key: 'group', type: 'Grupp' },
    { key: 'meeting', type: 'Möte' },
    { key: 'lunch', type: 'Lunch' },
  ];
  let detected = 'Annat';
  for (const k of typeKeywords) {
    if (lower.includes(k.key)) { detected = k.type; break; }
  }
  const subject = parseSubjectDisplay(s);
  return { type: detected, subject, title: s };
}

// -------- Public API --------
export async function parseIcsText(icsText) {
  const data = ical.sync.parseICS(icsText);
  const events = [];
  for (const k of Object.keys(data)) {
    const item = data[k];
    if (item.type === 'VEVENT' && item.start && item.end) {
      events.push({
        start: toDate(item.start),
        end:   toDate(item.end),
        summary: item.summary || '',
        location: item.location || '',
        allDay: item.datetype === 'date',
      });
    }
  }
  events.sort((a,b) => a.start - b.start);
  return events;
}

// Legacy: text-only plan (kept for compatibility)
export async function buildPlan(events, preferences, studyTechnique) {
  const { text } = await buildPlanStructured(events, preferences, studyTechnique, 'weekly');
  return text;
}

// New: returns both a human-readable text AND a structured list of events for UI calendars
export async function buildPlanStructured(events, preferences, studyTechnique, view = 'weekly', selectedDate = null) {
  const blocks = techniqueToBlockMinutes(studyTechnique);

  // Simple heuristics from preferences
  const prefText = String(preferences || '').toLowerCase();
  const examFocus = /tenta|examination|prov/.test(prefText);
  const dateMatches = Array.from(String(preferences || '').matchAll(/(\d{4}-\d{2}-\d{2})/g)).map(m => m[1]);
  let nextExamDate = null;
  if (dateMatches.length) {
    const today = new Date();
    const parsed = dateMatches.map(s => new Date(s)).filter(d => !isNaN(d));
    const future = parsed.filter(d => d >= new Date(today.toDateString()));
    future.sort((a,b) => a - b);
    nextExamDate = future[0] || null;
  }

  // Collect subjects across imported events (for study block assignment)
  const subjectCounts = new Map();
  // Group imported events by day
  const byDay = new Map();
  for (const ev of events) {
    const key = ev.start.toISOString().slice(0,10);
    if (!byDay.has(key)) byDay.set(key, []);
    const meta = classifyEvent(ev.summary);
    // Track subject frequency with display form
    const parts = subjectParts(meta.subject || 'Allmänt');
    const display = parts.code ? `${parts.full} – ${parts.code}` : parts.full;
    subjectCounts.set(display, (subjectCounts.get(display) || 0) + 1);
    byDay.get(key).push({ start: ev.start, end: ev.end, summary: ev.summary, type: meta.type, subject: display, subjectFull: parts.full, courseCode: parts.code, source: 'imported' });
  }
  for (const arr of byDay.values()) arr.sort((a,b) => a.start - b.start);

  const buildRange = () => {
    if (view === 'daily') {
      const base = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
      const yyyy = base.getFullYear();
      const mm = String(base.getMonth()+1).padStart(2,'0');
      const dd = String(base.getDate()).padStart(2,'0');
      const key = `${yyyy}-${mm}-${dd}`;
      return [key];
    }
    const keys = [];
    const start = new Date();
    for (let i=0;i<7;i++){
      const d = new Date(start);
      d.setDate(d.getDate()+i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      keys.push(`${yyyy}-${mm}-${dd}`);
    }
    return keys;
  };

  const keys = buildRange();
  const lines = [];
  const planEvents = [];

  // Subjects ordered by frequency (desc)
  const subjectsOrdered = Array.from(subjectCounts.entries())
    .sort((a,b) => b[1]-a[1])
    .map(([name]) => name);
  if (!subjectsOrdered.length) subjectsOrdered.push('Allmänt');

  for (const key of keys) {
    const dayStart = new Date(`${key}T08:00:00`);
    const dayEnd   = new Date(`${key}T20:00:00`);

    // Start with imported events and sort
    const imported = (byDay.get(key) || []).filter(e => overlaps(dayStart, dayEnd, e.start, e.end));

    // Add a fixed lunch 12:00-13:00 if it's free
    const lunchS = new Date(`${key}T12:00:00`);
    const lunchE = new Date(`${key}T13:00:00`);
    const lunchFree = !imported.some(e => overlaps(lunchS, lunchE, e.start, e.end));
    const dayItems = [...imported];
    if (lunchFree) {
      dayItems.push({ start: lunchS, end: lunchE, summary: 'Lunch', type: 'Lunch', subject: 'Paus', subjectFull: 'Paus', courseCode: '', source: 'added' });
    }

    // Build gaps for study blocks using merged busy intervals (imported + lunch)
    dayItems.sort((a,b) => a.start - b.start);
    const gaps = [];
    let cursor = dayStart;
    for (const b of dayItems) {
      if (cursor < b.start) gaps.push({ start: new Date(cursor), end: new Date(b.start) });
      cursor = new Date(Math.max(cursor, b.end));
    }
    if (cursor < dayEnd) gaps.push({ start: new Date(cursor), end: new Date(dayEnd) });

    // Fill gaps with study focus blocks
    let pomCount = 0;
    let subjIdx = 0;
    for (const gap of gaps) {
      let t = new Date(gap.start);
      while (t.getTime() + blocks.work*60000 <= gap.end.getTime()) {
        const tEnd = new Date(t.getTime() + blocks.work*60000);
        const chosen = subjectsOrdered[subjIdx % subjectsOrdered.length] || 'Allmänt';
        subjIdx++;
        const parts = subjectParts(chosen);
        const subjDisplay = parts.code ? `${parts.full} – ${parts.code}` : parts.full;
        const ev = { start: t, end: tEnd, summary: `Eget arbete – ${subjDisplay}` , type: 'Eget arbete', subject: subjDisplay, subjectFull: parts.full, courseCode: parts.code, source: 'added' };
        dayItems.push(ev);
        pomCount++;
        const isLong = blocks.longEvery && (pomCount % blocks.longEvery === 0);
        const pause = (isLong ? blocks.longBreak : blocks.break) * 60000;
        t = new Date(tEnd.getTime() + pause);
      }
    }

    // Sort final items and push to outputs
    dayItems.sort((a,b) => a.start - b.start);

    lines.push(`\n${key}`);
    if (dayItems.length === 0) {
      lines.push('• Inga händelser / studiepass');
    } else {
      for (const it of dayItems) {
        const subjDisplay = it.subject || 'Allmänt';
        const typeText = it.type;
        lines.push(`• ${timeHM(it.start)}–${timeHM(it.end)} | ${subjDisplay} | ${typeText}`);

        // Collect structured
        planEvents.push({
          id: `${key}-${timeHM(it.start)}-${timeHM(it.end)}-${typeText}`,
          title: `${subjDisplay} | ${typeText}`,
          start: it.start.toISOString(),
          end: it.end.toISOString(),
          extendedProps: { type: it.type, subject: it.subject, subjectFull: it.subjectFull || it.subject, courseCode: it.courseCode || '', source: it.source }
        });
      }
    }
  }

  const header =
`Optimerad ${view === 'daily' ? 'dag' : 'vecka'} (teknik: ${label(studyTechnique)})
${examFocus ? 'Prioritet: kommande tenta – fokusera repetition och övningar.' : ''}
Preferenser (fri text):
${String(preferences || '').trim() ? String(preferences || '').trim() : '- (inga)'}
------------------------------------------`;

  return { text: header + lines.join('\n'), events: planEvents };
}

export function buildIcsFromPlan(optimizedSchedule) {
  const lines = optimizedSchedule.split('\n');
  const days = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (m) { current = { date: m[1], items: [] }; days.push(current); continue; }
    if (current && line.startsWith('• ')) current.items.push(line.slice(2));
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Study Planner//MVP//EN'
  ];

  for (const d of days) {
    const dt = d.date.replace(/-/g,'');
    ics.push('BEGIN:VEVENT');
    ics.push(`DTSTART;VALUE=DATE:${dt}`);
    ics.push(`DTEND;VALUE=DATE:${dt}`);
    ics.push(`SUMMARY:Studieplan`);
    ics.push(`DESCRIPTION:${escapeText(d.items.join('\\n'))}`);
    // Add a default alert 10 minutes before day start
    ics.push('BEGIN:VALARM');
    ics.push('ACTION:DISPLAY');
    ics.push('DESCRIPTION:Study block starting');
    ics.push('TRIGGER:-PT10M');
    ics.push('END:VALARM');
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function escapeText(s) {
  return String(s).replace(/([,;])/g,'\\$1').replace(/\n/g,'\\n');
}

function isIcsContent(text) {
  return /BEGIN:VCALENDAR/i.test(text || '');
}

function extractIcsUrlFromHtml(html, baseUrl) {
  // Try to find explicit .ics links or format=ical links
  const hrefs = [];
  // href="..."
  let m;
  const regexDQ = /href\s*=\s*"([^"]+)"/ig;
  while ((m = regexDQ.exec(html)) !== null) hrefs.push(m[1]);
  // href='...'
  const regexSQ = /href\s*=\s*'([^']+)'/ig;
  while ((m = regexSQ.exec(html)) !== null) hrefs.push(m[1]);
  // href=unquoted
  const regexUQ = /href\s*=\s*([^'"\s>]+)/ig;
  while ((m = regexUQ.exec(html)) !== null) hrefs.push(m[1]);

  // Also scan for TimeEdit-specific ri.ics pattern even if not in href
  const riIcsMatch = html.match(/ri\.ics[^"'\s>]*/i);
  if (riIcsMatch) hrefs.unshift(riIcsMatch[0]);

  const decode = (s) => String(s).replace(/&amp;/g, '&');

  const candidates = hrefs
    .map(decode)
    .filter((h) => /\.ics(\?|$)/i.test(h) || /ri\.ics/i.test(h) || /(?:\b|_)(?:ical|iCal)\b/i.test(h) || /format=ical/i.test(h));

  for (const cand of candidates) {
    try {
      const absolute = new URL(cand, baseUrl).toString();
      return absolute;
    } catch {}
  }

  // TimeEdit heuristics as a last resort
  try {
    const u = new URL(baseUrl);
    if (/timeedit\./i.test(u.hostname)) {
      if (u.pathname.endsWith('.html')) {
        // naive fallback: same path but with .ics
        return u.toString().replace(/\.html(?:\?.*)?$/i, '.ics');
      }
      // or try the conventional ri.ics in the same directory
      const dir = u.pathname.replace(/\/[^/]*$/, '/');
      return new URL('ri.ics', `${u.origin}${dir}`).toString();
    }
  } catch {}
  return null;
}

/**
 * Robust: getCalendarEvents
 * Accepts a URL (HTML page or direct ICS) or a filesystem path
 */
export async function getCalendarEvents(source) {
  if (source.startsWith('http')) {
    // First request – allow HTML or ICS
    const res = await fetch(source, {
      headers: {
        'Accept': 'text/calendar, text/plain, text/html;q=0.9, */*;q=0.8',
        'User-Agent': 'ScheduleOptimizer/1.0 (+https://localhost)',
        'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8'
      },
      redirect: 'follow'
    });
    if (!res.ok) throw new Error(`Failed to fetch calendar page: ${res.status} ${res.statusText}`);

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (/text\/calendar|text\/plain|application\/octet-stream/i.test(contentType) || isIcsContent(text)) {
      return await parseIcsText(text);
    }

    // Try to capture cookies to pass to a follow-up ICS request
    const cookies = (() => {
      try {
        const raw = typeof res.headers.raw === 'function' ? res.headers.raw()['set-cookie'] : null;
        if (Array.isArray(raw) && raw.length) return raw.map((c) => c.split(';')[0]).join('; ');
        const single = res.headers.get('set-cookie');
        return single ? single.split(';')[0] : '';
      } catch {
        return '';
      }
    })();

    // If HTML, try to locate an ICS link within the page (TimeEdit, etc.)
    const icsUrl = extractIcsUrlFromHtml(text, source);
    if (icsUrl) {
      const r2 = await fetch(icsUrl, {
        headers: {
          'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
          'User-Agent': 'ScheduleOptimizer/1.0 (+https://localhost)',
          'Accept-Language': 'sv-SE,sv;q=0.9,en;q=0.8',
          'Referer': source,
          ...(cookies ? { 'Cookie': cookies } : {})
        },
        redirect: 'follow'
      });
      if (!r2.ok) throw new Error(`Failed to fetch ICS export: ${r2.status} ${r2.statusText}`);
      const calText = await r2.text();
      if (!isIcsContent(calText)) throw new Error('The linked resource is not a valid ICS calendar');
      return await parseIcsText(calText);
    }

    throw new Error('Länken verkar inte vara en ICS/iCal-export. Öppna sidan och välj "iCal"/"Prenumerera" för att kopiera exportlänken.');
  }

  // Local file path
  const events = await ical.async.parseFile(source);
  const data = Object.values(events)
    .filter(e => e.type === 'VEVENT' && e.start && e.end)
    .map(e => ({
      start: toDate(e.start),
      end: toDate(e.end),
      summary: e.summary || '',
      location: e.location || '',
      allDay: e.datetype === 'date'
    }))
    .sort((a, b) => a.start - b.start);
  return data;
}
