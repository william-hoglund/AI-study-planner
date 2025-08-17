// src/services/scheduler.js
import { parseEventsFromIcs } from "./calendarSource.js";
import { parsePreferences } from "./prefsParser.js";
import { makeTechniqueTemplate } from "./techniques.js";
import { subtractBusyFromWindow, dayWindowsBetween } from "./timeMath.js";

export async function planSchedule(input) {
  const { icsText, preferences, studyTechnique, view, date, locks = [] } = input;
  const busy = parseEventsFromIcs(icsText);
  const rules = parsePreferences(preferences || "");
  const tech = makeTechniqueTemplate(studyTechnique);

  // bygg planeringsfönster (daily/weekly)
  const baseDates = buildBaseDates(view, date, rules);
  const dayFree = baseDates.flatMap(d => {
    const dayWin = dayWindowsBetween(d, rules?.avoidTimes?.some(a=>a.before==="08:00")?9:8,  // enkel justering
                                         rules?.avoidTimes?.some(a=>a.after==="20:00")?20:21);
    const dayBusy = busy.filter(ev => sameDay(ev.start, d));
    // respektera manuellt låsta block (ska ej överplaneras)
    const lockedBusy = locks.map(l => ({ start: new Date(l.start), end: new Date(l.end), title: l.title || "Låst" }))
                            .filter(ev => sameDay(ev.start, d));
    const allBusy = [...dayBusy, ...lockedBusy];
    return dayWin.flatMap(w => subtractBusyFromWindow(w, allBusy));
  });

  // fyll block
  const targetMinutes = rules.targetHoursPerDay ? rules.targetHoursPerDay * 60 * baseDates.length : 3*60*baseDates.length;
  const blocks = fillGreedy(dayFree, tech, rules, targetMinutes);

  const planText = blocks.map(b => `- ${fmt(b.start)}–${fmt(b.end)}: ${b.label}`).join("\n");
  return {
    plan: planText,
    structured: blocks,
    eventsCount: busy.length,
  };
}

function buildBaseDates(view, date, rules) {
  const ref = date ? new Date(date) : new Date();
  const days = [];
  if (view === "daily") {
    if (!isWeekend(ref) || !rules.weekendsOff) days.push(ref);
    return days;
  }
  // weekly: måndag→söndag
  const monday = startOfWeek(ref);
  for (let i=0;i<7;i++){
    const d = addDays(monday, i);
    if (rules.weekendsOff && isWeekend(d)) continue;
    days.push(d);
  }
  return days;
}

function fillGreedy(freeWindows, tech, rules, targetMinutes) {
  const out = [];
  let scheduled = 0;

  for (const w of freeWindows) {
    let cursor = new Date(w.start);
    while (cursor < w.end && scheduled < targetMinutes) {
      const workMin = Math.min(tech.work, (w.end - cursor)/60000);
      if (workMin < 15) break; // för små bitar

      const next = new Date(cursor.getTime() + workMin*60000);
      // undvik sena tider enligt regler
      if (shouldAvoid(next, rules)) break;

      const label = chooseLabel(rules, tech);
      out.push({ title: label, label, start: new Date(cursor), end: next });

      scheduled += workMin;
      // lägg paus
      cursor = new Date(next.getTime() + (tech.break || 0)*60000);

      // respektera maxBlock per fönster via en liten buffert
      if (scheduled >= targetMinutes) break;
    }
  }
  return out;
}

function shouldAvoid(d, rules) {
  const hm = d.toTimeString().slice(0,5);
  if (rules.avoidTimes?.some(a => a.after && hm >= a.after)) return true;
  if (rules.avoidTimes?.some(a => a.before && hm <= a.before)) return true;
  return false;
}

function chooseLabel(rules, tech) {
  const subj = rules.priorities?.[0]?.course || "Studiepass";
  return `${subj} – ${tech.label}`;
}

// helpers
function fmt(d){ return d.toTimeString().slice(0,5); }
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function startOfWeek(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isWeekend(d){ const g=d.getDay(); return g===0||g===6; }
