import { useState } from 'react';
import './ScheduleForm.css'; // Import a CSS file for styling

function ScheduleForm({ onGenerateSchedule }) {
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState('');
  const [priority, setPriority] = useState('');
  const [availableHours, setAvailableHours] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!subject || !duration || !priority || !availableHours) {
      alert('Please fill out all fields.');
      return;
    }

    const formData = { subject, duration, priority, availableHours };
    onGenerateSchedule(formData); // Pass the data to the parent component
  };

  return (
    <form onSubmit={handleSubmit} className="schedule-form">
      <h2>Create Your Study Schedule</h2>
      <label>
        Subject:
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Enter subject"
          required
        />
      </label>
      <label>
        Duration (hours):
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Enter duration"
          required
        />
      </label>
      <label>
        Priority (1-5):
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="Enter priority"
          required
        />
      </label>
      <label>
        Available Hours per Day:
        <input
          type="number"
          value={availableHours}
          onChange={(e) => setAvailableHours(e.target.value)}
          placeholder="Enter available hours"
          required
        />
      </label>
      <button type="submit" className="submit-button">
        Generate Schedule
      </button>
    </form>
  );
}

export default ScheduleForm;