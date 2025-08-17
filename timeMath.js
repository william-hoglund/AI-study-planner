// src/services/timeMath.js
export function overlap(a, b) {
    return a.start < b.end && b.start < a.end;
  }
  
  export function subtractBusyFromWindow(window, busy) {
    // window:{start,end}, busy:[{start,end}]
    let free = [window];
    for (const b of busy) {
      free = free.flatMap(w => {
        if (!overlap(w, b)) return [w];
        const parts = [];
        if (w.start < b.start) parts.push({ start: w.start, end: new Date(b.start) });
        if (b.end < w.end) parts.push({ start: new Date(b.end), end: w.end });
        return parts.filter(p => p.end - p.start > 0);
      });
    }
    return mergeAdjacent(free);
  }
  
  export function mergeAdjacent(windows, gapMs = 60_000) {
    if (!windows.length) return [];
    const sorted = [...windows].sort((a,b)=>a.start-b.start);
    const out = [sorted[0]];
    for (let i=1;i<sorted.length;i++){
      const prev = out[out.length-1], cur = sorted[i];
      if (cur.start - prev.end <= gapMs) {
        prev.end = new Date(Math.max(prev.end, cur.end));
      } else out.push(cur);
    }
    return out;
  }
  
  export function dayWindowsBetween(date, startHour=8, endHour=20) {
    const d = new Date(date);
    const s = new Date(d); s.setHours(startHour,0,0,0);
    const e = new Date(d); e.setHours(endHour,0,0,0);
    return [{ start: s, end: e }];
  }
  