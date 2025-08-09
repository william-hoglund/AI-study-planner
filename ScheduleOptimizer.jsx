import React, { useState, useEffect } from 'react';
import './ScheduleOptimizer.css';
import ScheduleDisplay from './ScheduleDisplay.jsx';

export default function ScheduleOptimizer() {
  const [icsText, setIcsText] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [preferences, setPreferences] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const studyTechnique = localStorage.getItem('studyTechnique') || 'pomodoro25';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setIcsText(text);
    setIcsUrl('');
    setResult('');
    setErr('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setResult('');

    const urlClean = icsUrl.trim();

    if (!preferences.trim()) {
      setErr('Fyll i dina preferenser.');
      return;
    }
    if (!icsText && !urlClean) {
      setErr('Ladda upp en fil eller ange en länk.');
      return;
    }

    setLoading(true);
    const endpoint = icsText ? '/api/generate-schedule-from-file' : '/api/generate-schedule-from-url';
    const payload = icsText
      ? { icsText, preferences, studyTechnique }
      : { icsUrl: urlClean, preferences, studyTechnique };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data?.error || `Serverfel (${res.status})`);
      }
      setResult(data.optimizedSchedule);
    } catch (e) {
      setErr(e.message || 'Tekniskt fel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  // (valfritt) synka teknik om användaren ändrar i annan flik
  useEffect(() => {
    const onStorage = () => {
      const next = localStorage.getItem('studyTechnique') || 'pomodoro25';
      if (next !== studyTechnique) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [studyTechnique]);

  return (
    <div className="opt-page">
      <h1>AI Schemaoptimering</h1>
      <p className="subtitle">
        Länka eller ladda upp ditt schema, skriv dina prioriteringar – få ett optimerat studieschema baserat på <b>{labelFromTechnique(studyTechnique)}</b>.
      </p>

      <form className="opt-grid" onSubmit={handleSubmit} noValidate>
        <div className="card">
          <h2>1) Koppla schema</h2>

          <label className="label">Ladda upp .ics</label>
          <input type="file" accept=".ics" onChange={handleFileUpload} />

          <div className="or">eller</div>

          <label className="label">Länk till schema</label>
          <input
            type="text"
            placeholder="Klistra in valfri schema‑länk (TimeEdit, Kronox, Google...)"
            value={icsUrl}
            onChange={(e) => { setIcsUrl(e.target.value); setIcsText(''); setResult(''); setErr(''); }}
            inputMode="text"
            autoComplete="off"
            spellCheck="false"
          />

          <div className="hint">
            Du kan använda export/prenumerationslänkar från Google Calendar, TimeEdit, Kronox m.fl.
          </div>
        </div>

        <div className="card">
          <h2>2) Preferenser</h2>
          <textarea
            rows={8}
            placeholder={`Exempel:
- Tentor: Matte 2025-09-12, Mikroteori 2025-09-25
- Prioritera repetition för Matte (kap 3–6)
- Undvik sena kvällar efter 20:00
- Lägg in längre pass på lördag fm
`}
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
          />
          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Genererar…' : 'Generera schema'}
          </button>
          {err && (
            <>
              <div className="error">{err}</div>
              <div className="actions">
                <button className="primary" type="button" onClick={handleSubmit}>Försök igen</button>
              </div>
            </>
          )}
        </div>

        {result && (
          <div className="result">
            <ScheduleDisplay schedule={result} />
          </div>
        )}
      </form>
    </div>
  );
}

function labelFromTechnique(v) {
  switch (v) {
    case 'pomodoro25': return 'Pomodoro 25/5';
    case 'pomodoro50': return 'Pomodoro 50/10';
    case 'spaced': return 'Spaced Repetition';
    case 'recall': return 'Active Recall';
    case 'timeblock': return 'Time Blocking';
    case 'deepwork': return 'Deep Work';
    default: return 'Pomodoro 25/5';
  }
}
