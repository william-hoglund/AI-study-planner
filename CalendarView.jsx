import React, { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // drag, drop, click
import svLocale from "@fullcalendar/core/locales/sv";
// NOTE: Some FullCalendar builds no longer ship CSS files via ESM exports.
// If you need the official styles, either add them via CDN in index.html
// or install and reference the CSS files directly if your package version includes them.

function subjectLabel(ev) {
  const s = ev?.extendedProps?.subject || 'General';
  const c = ev?.extendedProps?.code ? ` (${ev.extendedProps.code})` : '';
  return `${s}${c}`;
}

export default function CalendarView({ events: externalEvents }) {
  // If events are passed in, use them; otherwise fall back to demo data
  const [events, setEvents] = useState(() => externalEvents || [
    {
      id: "1",
      title: "Lecture: Vectors",
      start: "2025-08-11T10:00:00",
      end: "2025-08-11T12:00:00",
      extendedProps: { subject: "Math", type: "Lecture" },
      backgroundColor: "#3b82f6", borderColor: "#3b82f6"
    },
  ]);

  // Sync when parent updates events
  React.useEffect(() => {
    if (externalEvents && Array.isArray(externalEvents)) {
      setEvents(externalEvents);
    }
  }, [externalEvents]);

  // Filter by subject
  const allSubjects = useMemo(() => {
    const set = new Set(events.map(e => subjectLabel(e)));
    return ["All", ...Array.from(set)];
  }, [events]);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const shownEvents = useMemo(() => {
    return subjectFilter === "All"
      ? events
      : events.filter(e => subjectLabel(e) === subjectFilter);
  }, [events, subjectFilter]);

  // Selected event for edit/copy
  const [selected, setSelected] = useState(null);

  // Click to edit / copy modal (super minimal UI for brevity)
  const [modalOpen, setModalOpen] = useState(false);
  const openEditor = (eventApi) => {
    const { id, title, start, end, extendedProps } = eventApi.event;
    setSelected({
      id,
      title,
      start: start.toISOString(),
      end: end?.toISOString(),
      subject: extendedProps?.subject || "General",
      type: extendedProps?.type || "Other",
    });
    setModalOpen(true);
  };

  const updateEvent = (updated) => {
    setEvents(prev => prev.map(e => (e.id === updated.id
      ? { ...e, title: updated.title, start: updated.start, end: updated.end, extendedProps: { subject: updated.subject, type: updated.type } }
      : e
    )));
    setModalOpen(false);
  };

  const deleteEvent = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  };

  const copyEventToWeekOffset = (id, weekOffset = 1) => {
    const src = events.find(e => e.id === id);
    if (!src) return;
    const shift = (iso, weeks) => new Date(new Date(iso).getTime() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
    const newId = crypto.randomUUID?.() || String(Math.random());
    setEvents(prev => prev.concat({
      ...src,
      id: newId,
      start: shift(src.start, weekOffset),
      end: src.end ? shift(src.end, weekOffset) : undefined,
    }));
  };

  // Drag/resize handlers
  const onEventChange = (changeInfo) => {
    const { event } = changeInfo;
    setEvents(prev => prev.map(e => (e.id === event.id
      ? { ...e, start: event.start.toISOString(), end: event.end?.toISOString() }
      : e
    )));
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Filter UI */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <label style={{ color: 'var(--muted)' }}>Filter by subject:</label>
        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locales={[svLocale]}
        locale="sv"
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        nowIndicator
        editable     // drag to move
        droppable={false}
        selectable   // (optional) select to create
        eventResizableFromStart  // resize from either end
        events={shownEvents.map(e => ({
          ...e,
          title: `${subjectLabel(e)} — ${e.title}`,
        }))}
        eventClick={(info) => openEditor(info)}
        eventDrop={onEventChange}
        eventResize={onEventChange}
        // Nice compact rendering
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventMouseEnter={(info) => { info.el.style.filter = 'brightness(0.95)'; info.el.style.cursor = 'pointer'; }}
        eventMouseLeave={(info) => { info.el.style.filter = ''; }}
      />

      {/* Super-simple modal */}
      {modalOpen && selected && (
        <div style={modalStyles.backdrop}>
          <div style={modalStyles.card}>
            <h3>Edit event</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <label>
                Title
                <input
                  value={selected.title}
                  onChange={e => setSelected({ ...selected, title: e.target.value })}
                />
              </label>
              <label>
                Subject
                <input
                  value={selected.subject}
                  onChange={e => setSelected({ ...selected, subject: e.target.value })}
                />
              </label>
              <label>
                Start (ISO)
                <input
                  value={selected.start}
                  onChange={e => setSelected({ ...selected, start: e.target.value })}
                />
              </label>
              <label>
                End (ISO)
                <input
                  value={selected.end || ""}
                  onChange={e => setSelected({ ...selected, end: e.target.value })}
                />
              </label>

              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
                <button className="primary" onClick={() => updateEvent(selected)}>Save</button>
                <button onClick={() => copyEventToWeekOffset(selected.id, 1)}>Copy → next week</button>
                <button onClick={() => copyEventToWeekOffset(selected.id, -1)}>Copy → previous week</button>
                <button onClick={() => deleteEvent(selected.id)} style={{ background: "#d32f2f", color: '#fff', borderRadius: 12, padding: '10px 12px', border: 0 }}>Delete</button>
                <button onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalStyles = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "grid", placeItems: "center", zIndex: 1000,
  },
  card: {
    background: "white", color: "#222", padding: 16, borderRadius: 12, width: 420, maxWidth: "90vw",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
};
