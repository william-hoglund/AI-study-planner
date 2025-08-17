import React, { useMemo, useState } from 'react';
import ScheduleDisplay from './ScheduleDisplay.jsx';
import CalendarView from './CalendarView.jsx';

// Generate stable color map per subject
const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16', '#a855f7', '#0ea5e9',
  '#fb7185', '#22c55e', '#eab308', '#6366f1', '#14b8a6', '#f97316', '#dc2626', '#64748b'
];
function hashStringToIndex(str) {
  let h = 0; for (let i=0;i<str.length;i++){ h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}
function subjectColor(subject) {
  const s = String(subject || 'General');
  const idx = hashStringToIndex(s) % PALETTE.length;
  return PALETTE[idx];
}

export default function PlanResults({ textPlan, structuredEvents }) {
  const [mode, setMode] = useState('calendar'); // 'calendar' or 'text'

  const coloredEvents = useMemo(() => {
    return (structuredEvents || []).map(ev => {
      const subj = ev?.extendedProps?.subject || 'General';
      const color = subjectColor(subj);
      return { ...ev, backgroundColor: color, borderColor: color };
    });
  }, [structuredEvents]);

  const subjects = useMemo(() => {
    const set = new Set((structuredEvents || []).map(e => e?.extendedProps?.subject || 'General'));
    return Array.from(set);
  }, [structuredEvents]);

  return (
    <div className="result">
      {/* Always show legend at top */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
        {subjects.map(s => (
          <span key={s} className="legend-chip">
            <span style={{ width: 12, height: 12, borderRadius: 3, background: subjectColor(s), display: 'inline-block' }} />
            {s}
          </span>
        ))}
      </div>

      <div className="mode-toggle" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
        <button onClick={() => setMode('calendar')} className={mode==='calendar' ? 'primary' : ''}>Kalendervy</button>
        <button onClick={() => setMode('text')} className={mode==='text' ? 'primary' : ''}>Textvy</button>
      </div>

      {mode === 'calendar' ? (
        <CalendarView events={coloredEvents} />
      ) : (
        <ScheduleDisplay schedule={textPlan} />
      )}
    </div>
  );
}
