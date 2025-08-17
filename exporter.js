// src/services/exporter.js
export function buildIcs(events=[], name="AI Study Plan") {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `X-WR-CALNAME:${escape(name)}`,
      "PRODID:-//ai-study-planner//EN"
    ];
    events.forEach((e,i)=>{
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${Date.now()}-${i}@ai-study-planner`);
      lines.push(`DTSTAMP:${toIcsDate(new Date())}`);
      lines.push(`DTSTART:${toIcsDate(new Date(e.start))}`);
      lines.push(`DTEND:${toIcsDate(new Date(e.end))}`);
      lines.push(`SUMMARY:${escape(e.title || e.label || "Studiepass")}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return lines.join("\r\n");
  }
  
  function toIcsDate(d) {
    const pad = n=>String(n).padStart(2,"0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }
  function escape(s){ return String(s).replace(/([,;])/g, "\\$1").replace(/\n/g,"\\n"); }
  