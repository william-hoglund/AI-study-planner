// filepath: src/components/ExportCalendarTab.jsx
import React from 'react';

// Utility: safe filename from calendarName
function sanitizeFilename(name = 'schedule') {
  return String(name)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_\.]/g, '')
    .slice(0, 80) || 'schedule';
}

// Utility: escape text for ICS
function escapeICS(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Utility: format to ICS UTC datetime (YYYYMMDDTHHMMSSZ)
function toICSDateTime(dtLike) {
  const d = dtLike instanceof Date ? dtLike : new Date(dtLike);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

// Build ICS file text from events
function buildICS(structured = [], calendarName = 'AI Study Plan') {
  const now = new Date();
  const dtStamp = toICSDateTime(now);
  const calName = escapeICS(calendarName || 'AI Study Plan');

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//AI Study Planner//Schedule Optimizer//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  structured.forEach((ev, idx) => {
    const title = escapeICS(ev?.title || 'Untitled');
    const start = ev?.start ? toICSDateTime(ev.start) : dtStamp;
    const end = ev?.end ? toICSDateTime(ev.end) : start;
    const uid = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${idx}`) + '@ai-study-planner';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// Trigger a browser download for given blob
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Lazy-load jsPDF from CDN (ES module build)
async function loadJsPDF() {
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js');
    return mod.jsPDF;
  } catch (e1) {
    // Fallback CDN
    const mod = await import('https://unpkg.com/jspdf@2.5.1/dist/jspdf.es.min.js');
    return mod.jsPDF;
  }
}

// Export PDF helper
async function exportAsPDF(structured = [], calendarName = 'AI Study Plan') {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const margin = 40;
  const lineHeight = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(calendarName || 'AI Study Plan', margin, margin);
  doc.setDrawColor(200);
  doc.line(margin, margin + 8, pageWidth - margin, margin + 8);
  let y = margin + 28;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  if (!structured || structured.length === 0) {
    doc.text('No events to export.', margin, y);
  } else {
    // Header row
    doc.setFont('helvetica', 'bold');
    doc.text('Title', margin, y);
    doc.text('Start', margin + 240, y);
    doc.text('End', margin + 420, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    structured.forEach((ev, i) => {
      const title = String(ev?.title || 'Untitled');
      const start = ev?.start ? new Date(ev.start) : null;
      const end = ev?.end ? new Date(ev.end) : null;
      const startStr = start ? start.toLocaleString() : '-';
      const endStr = end ? end.toLocaleString() : '-';

      // Handle pagination
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }

      // Wrap title if long
      const titleLines = doc.splitTextToSize(title, 220);
      doc.text(titleLines, margin, y);
      doc.text(startStr, margin + 240, y);
      doc.text(endStr, margin + 420, y);

      y += Math.max(lineHeight, titleLines.length * lineHeight * 0.8);
      doc.setDrawColor(240);
      doc.line(margin, y - 10, pageWidth - margin, y - 10);
    });
  }

  const filename = `${sanitizeFilename(calendarName || 'schedule')}.pdf`;
  doc.save(filename);
}

// Export ICS helper
function exportAsICS(structured = [], calendarName = 'AI Study Plan') {
  const ics = buildICS(structured, calendarName);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const filename = `${sanitizeFilename(calendarName || 'schedule')}.ics`;
  triggerDownload(blob, filename);
}

export default function ExportCalendarTab({ structured, calendarName }) {
  const hasEvents = Array.isArray(structured) && structured.length > 0;

  const onExportPDF = async () => {
    try {
      await exportAsPDF(structured, calendarName);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Could not export PDF. Please try again.');
    }
  };

  const onExportICS = () => {
    try {
      exportAsICS(structured, calendarName);
    } catch (err) {
      console.error('ICS export failed:', err);
      alert('Could not export .ics. Please try again.');
    }
  };

  return (
    <div className="export-tab">
      <h2>Exportera schema</h2>
      <p>Exportera din plan "{calendarName || 'AI Study Plan'}" som PDF eller iCalendar (.ics).</p>

      {hasEvents ? (
        <ul style={{ margin: '12px 0 16px 16px' }}>
          {structured.map((event, i) => (
            <li key={i} style={{ lineHeight: 1.5 }}>
              <strong>{event.title || 'Untitled'}</strong>{' '}
              <span style={{ color: 'var(--muted)' }}>
                ({event.start ? new Date(event.start).toLocaleString() : '-'} – {event.end ? new Date(event.end).toLocaleString() : '-'})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Inga schemaposter att exportera ännu.</p>
      )}

      <div className="actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <button className="primary" onClick={onExportPDF} disabled={!hasEvents} aria-disabled={!hasEvents}>
          Export as PDF
        </button>
        <button className="ghost" onClick={onExportICS} disabled={!hasEvents} aria-disabled={!hasEvents}>
          Export as .ics
        </button>
      </div>
    </div>
  );
}
