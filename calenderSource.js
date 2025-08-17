// src/services/calendarSource.js
import ical from "node-ical";
import fetch from "node-fetch";

export async function getCalendarText(url) {
  if (!url) return null;
  const r = await fetch(url, { timeout: 15000 });
  if (!r.ok) throw new Error("Kunde inte hämta kalendern");
  return await r.text();
}

export function parseEventsFromIcs(icsText) {
  if (!icsText) return [];
  const data = ical.sync.parseICS(icsText);
  return Object.values(data)
    .filter(v => v?.type === "VEVENT")
    .map(ev => ({
      title: ev.summary || "Event",
      start: new Date(ev.start),
      end: new Date(ev.end),
      allDay: ev.datetype === "date",
      location: ev.location || ""
    }))
    .sort((a,b) => a.start - b.start);
}
