import './ScheduleDisplay.css';

function ScheduleDisplay({ schedule }) {
  return (
    <div className="schedule-display">
      <h2>Your Optimized Schedule</h2>
      <div className="schedule-card">
        <pre>{schedule}</pre>
      </div>
    </div>
  );
}

export default ScheduleDisplay;
