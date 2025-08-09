import ical from 'node-ical';

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

export async function buildPlan(events, preferences, studyTechnique) {
  const blocks = techniqueToBlockMinutes(studyTechnique);

  const byDay = new Map();
  for (const ev of events) {
    const dayKey = ev.start.toISOString().slice(0,10);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey).push({ start: ev.start, end: ev.end, summary: ev.summary });
  }
  for (const arr of byDay.values()) arr.sort((a,b) => a.start - b.start);

  const out = [];
  const now = new Date();
  for (let i=0;i<7;i++){
    const d = new Date(now);
    d.setDate(d.getDate()+i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const key = `${yyyy}-${mm}-${dd}`;

    const dayStart = new Date(`${key}T08:00:00`);
    const dayEnd   = new Date(`${key}T20:00:00`);
    const busy = (byDay.get(key) || []).filter(e => overlaps(dayStart, dayEnd, e.start, e.end));

    const gaps = [];
    let cursor = dayStart;
    for (const b of busy) {
      if (cursor < b.start) gaps.push({ start: new Date(cursor), end: new Date(b.start) });
      cursor = new Date(Math.max(cursor, b.end));
    }
    if (cursor < dayEnd) gaps.push({ start: new Date(cursor), end: new Date(dayEnd) });

    const dayLines = [];
    let pomCount = 0;
    for (const gap of gaps) {
      let t = new Date(gap.start);
      while (t.getTime() + blocks.work*60000 <= gap.end.getTime()) {
        const tEnd = new Date(t.getTime() + blocks.work*60000);
        dayLines.push(`${timeHM(t)}–${timeHM(tEnd)}  Fokuspass (${label(studyTechnique)})`);
        pomCount++;
        const isLong = blocks.longEvery && (pomCount % blocks.longEvery === 0);
        const pause = (isLong ? blocks.longBreak : blocks.break) * 60000;
        t = new Date(tEnd.getTime() + pause);
      }
    }

    out.push(`\n${key}\n${dayLines.length ? dayLines.map(l=>'• '+l).join('\n') : '• Inga tillgängliga fokuspass'}`);
  }

  const header =
`AI-optimerad plan (teknik: ${label(studyTechnique)})
Preferenser (fri text):
${preferences.trim() ? preferences.trim() : '- (inga)'}
------------------------------------------`;

  return header + out.join('\n');
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

function timeHM(d) {
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
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
    ics.push('END:VEVENT');
  }

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function escapeText(s) {
  return String(s).replace(/([,;])/g,'\\$1').replace(/\n/g,'\\n');
}

/**
 * NEW: getCalendarEvents
 * Reads and parses an ICS calendar from a file path or URL
 */
export async function getCalendarEvents(source) {
  let data;
  if (source.startsWith("http")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch calendar: ${res.statusText}`);
    const text = await res.text();
    data = await parseIcsText(text);
  } else {
    const events = await ical.async.parseFile(source);
    data = Object.values(events)
      .filter(e => e.type === "VEVENT" && e.start && e.end)
      .map(e => ({
        start: toDate(e.start),
        end: toDate(e.end),
        summary: e.summary || '',
        location: e.location || '',
        allDay: e.datetype === 'date'
      }))
      .sort((a, b) => a.start - b.start);
  }
  return data;
}
