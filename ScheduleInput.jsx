import { useState } from 'react';

function ScheduleInput({ onGenerateSchedule }) {
  const [icsText, setIcsText] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setIcsText(text);
    setIcsUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!preferences.trim()) {
      alert('Fyll i dina preferenser!');
      return;
    }

    if (!icsText && !icsUrl.trim()) {
      alert('Ladda upp en .ics-fil eller ange en länk!');
      return;
    }

    const endpoint = '/api/plan';
    const payload = icsText
      ? { icsText, preferences }
      : { icsUrl: icsUrl.trim(), preferences };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    onGenerateSchedule(data.plan);
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
