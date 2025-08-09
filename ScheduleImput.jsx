import { useState } from 'react';

function ScheduleInput({ onGenerateSchedule }) {
  const [icsText, setIcsText] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();
    setIcsText(text);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!preferences) {
      alert('Fyll i dina preferenser!');
      return;
    }

    if (!icsText && !icsUrl) {
      alert('Ladda upp en .ics-fil eller ange en länk!');
      return;
    }

    const endpoint = icsText ? '/api/generate-schedule-from-file' : '/api/generate-schedule-from-url';
    const payload = icsText
      ? { icsText, preferences }
      : { icsUrl, preferences };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    onGenerateSchedule(data.optimizedSchedule);
  };

  return (
    <form onSubmit={handleSubmit} className="schedule-form">
      <h2>Ladda upp schema eller länka</h2>

      <label>
        Ladda upp .ics-fil:
        <input type="file" accept=".ics" onChange={handleFileUpload} />
      </label>

      <label>
        ...eller ange en länk till en .ics-fil:
        <input
          type="url"
          value={icsUrl}
          onChange={(e) => setIcsUrl(e.target.value)}
          placeholder="https://example.com/schedule.ics"
        />
      </label>

      <label>
        Preferenser (t.ex. prioriteringar, tentor, studiedagar):
        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          rows={4}
          required
        />
      </label>

      <button type="submit" className="submit-button">Generera schema</button>
    </form>
  );
}

export default ScheduleInput;
