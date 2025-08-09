import React from 'react';
import './GoalCalendar.css'; // om du har separat css, annars ta bort denna rad

function GoalCalendar({ goals }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const goalOnThisDate = goals.filter(goal => goal.date === dateString);
    return { day: i + 1, events: goalOnThisDate };
  });

  return (
    <div className="calendar-container">
      <h2>📅 Måladatumsöversikt (denna månad)</h2>
      <div className="calendar-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array(firstDayOfMonth).fill('').map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty" />
        ))}

        {dates.map((date, i) => (
          <div key={i} className="calendar-cell">
            <strong>{date.day}</strong>
            {date.events.map((event, idx) => (
              <div key={idx} className="calendar-event">
                🎯 {event.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GoalCalendar;
