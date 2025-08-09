import React, { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction"; // drag, drop, click

// Example color map per class/course
const CLASS_COLORS = {
  Math: "#e91e63",
  Physics: "#3f51b5",
  Chemistry: "#009688",
  Economics: "#ff9800",
  Default: "#607d8b",
};

// Quick helper to colorize an event by its course
function decorateEvent(ev) {
  const course = ev.extendedProps?.course;
  const color = CLASS_COLORS[course] || CLASS_COLORS.Default;
  return { ...ev, backgroundColor: color, borderColor: color };
}

export default function CalendarView() {
  // Replace this with data from your backend
  const [events, setEvents] = useState([
    {
      id: "1",
      title: "Lecture: Vectors",
      start: "2025-08-11T10:00:00",
      end: "2025-08-11T12:00:00",
      extendedProps: { course: "Math" },
    },
    {
      id: "2",
      title: "Seminar: Micro",
      start: "2025-08-12T09:00:00",
      end: "2025-08-12T10:30:00",
      extendedProps: { course: "Economics" },
    },
  ]);

  // Filter by class (course)
  const allCourses = useMemo(() => {
    const set = new Set(events.map(e => e.extendedProps?.course || "Unlabeled"));
    return ["All", ...Array.from(set)];
  }, [events]);

  const [courseFilter, setCourseFilter] = useState("All");
  const shownEvents = useMemo(() => {
    const filtered = courseFilter === "All"
      ? events
      : events.filter(e => (e.extendedProps?.course || "Unlabeled") === courseFilter);
    return filtered.map(decorateEvent);
  }, [events, courseFilter]);

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
      course: extendedProps?.course || "Unlabeled",
    });
    setModalOpen(true);
  };

  const updateEvent = (updated) => {
    setEvents(prev => prev.map(e => (e.id === updated.id
      ? { ...e, title: updated.title, start: updated.start, end: updated.end, extendedProps: { course: updated.course } }
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
        <label>Filter by class:</label>
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
          {allCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
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
        events={shownEvents}
        eventClick={(info) => openEditor(info)}
        eventDrop={onEventChange}
        eventResize={onEventChange}
        // Nice compact rendering
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
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
                Class/Course
                <input
                  value={selected.course}
                  onChange={e => setSelected({ ...selected, course: e.target.value })}
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
                <button onClick={() => updateEvent(selected)}>Save</button>
                <button onClick={() => copyEventToWeekOffset(selected.id, 1)}>Copy → next week</button>
                <button onClick={() => copyEventToWeekOffset(selected.id, -1)}>Copy → previous week</button>
                <button onClick={() => deleteEvent(selected.id)} style={{ background: "#d32f2f" }}>Delete</button>
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
