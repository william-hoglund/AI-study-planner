// src/services/prefsParser.js
export function parsePreferences(text="") {
    const lower = text.toLowerCase();
    const avoidTimes = [];
    if (/(efter|post)\s?20[:\.]?00/.test(lower)) avoidTimes.push({ after: "20:00" });
    if (/(före|pre)\s?08[:\.]?00/.test(lower)) avoidTimes.push({ before: "08:00" });
  
    const weekendsOff = /(helgledigt|ingen\s?(studie)?tid\s?(lör|sön)|endast vardagar)/.test(lower);
    const targetHoursPerDay = numberFrom(lower, /(mål|target).{0,10}(\d+)\s*h/i) ?? null;
  
    // superenkel prioritering: ord vi ser i texten
    const priorities = [];
    const subjects = ["matte","fysik","ekonomi","programmering","statistik","juridik","biologi"];
    subjects.forEach(s=>{
      if (lower.includes(s)) priorities.push({ course: cap(s) });
    });
  
    return { avoidTimes, weekendsOff, targetHoursPerDay, priorities };
  }
  
  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function numberFrom(str, re) {
    const m = str.match(re); return m ? Number(m[2] || m[1]) : null;
  }
  