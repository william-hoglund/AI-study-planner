import React, { useState, useEffect, useRef } from 'react';
import './ScheduleOptimizer.css';
import PlanResults from './PlanResults.jsx';
import { labelFromTechnique } from './utils/labels';
import ExportCalendarTab from './ExportCalendarTab.jsx';

export default function ScheduleOptimizer({ hideTitle = false }) {
  // --- state ---
  const [icsText, setIcsText] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [preferences, setPreferences] = useState('');
  const [result, setResult] = useState('');
  const [structured, setStructured] = useState([]);
  const [meta, setMeta] = useState({ eventsCount: 0, usedAI: false });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [studyTechnique, setStudyTechnique] = useState(
    localStorage.getItem('studyTechnique') || 'pomodoro25'
  );
  const [useAI, setUseAI] = useState(false);
  const [view, setView] = useState('weekly'); // 'weekly' | 'daily'
  const [date, setDate] = useState(''); // yyyy-mm-dd
  const [improvementNotes, setImprovementNotes] = useState('');

  // UI tabs
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'export'

  // [1] file badge info
  const [fileInfo, setFileInfo] = useState(null); // {name, size}

  // [4] AI suggest prior to generation
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [aiLastSuggestion, setAiLastSuggestion] = useState('');

  // [5] save multiple plans (from backend if logged in, else localStorage)
  const [savedPlans, setSavedPlans] = useState([]); // [{id, title, plan, structured, meta, createdAt}]
  const [activeTabId, setActiveTabId] = useState(null);

  // Abort controller for ongoing fetch
  const abortRef = useRef(null);
  const resultRef = useRef(null);

  // helpers
  const isValidDate = (s) => /\d{4}-\d{2}-\d{2}/.test(s);
  const isValidUrl = (u) => {
    try {
      const { protocol } = new URL(u);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  };
  const canSubmit =
    !!preferences.trim() &&
    (!!icsText || (icsUrl.trim() && isValidUrl(icsUrl.trim()))) &&
    (view !== 'daily' || isValidDate(date));

  // [3] Quick presets
  const quickPresets = [
    'Undvik sena kvällar efter 20:00',
    'Helgledigt, inga block lör/sön',
    'Extra repetition i matematik (kap 3–6)',
    'Prioritera tentaplugg 2 veckor innan prov',
    'Lägg in längre pass lördag förmiddag',
  ];
  const addPreset = (text) => {
    setPreferences((prev) => (prev.trim() ? `${prev.trim()}\n- ${text}` : `- ${text}`));
  };

  // Scroll to results
  useEffect(() => {
    if (!result) return;
    const el = resultRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, [result]);

  // Load persisted inputs once on mount and fetch saved plans
  useEffect(() => {
    const p = localStorage.getItem('so_prefs');
    if (p) setPreferences(p);
    const u = localStorage.getItem('so_icsUrl');
    if (u) setIcsUrl(u);
    const v = localStorage.getItem('so_view');
    if (v) setView(v);
    const d = localStorage.getItem('so_date');
    if (d) setDate(d);

    const token = localStorage.getItem('token');
    if (!token) {
      // fallback: localStorage plans
      const rawPlans = localStorage.getItem('so_savedPlans');
      if (rawPlans) {
        try { const arr = JSON.parse(rawPlans); if (Array.isArray(arr)) setSavedPlans(arr); } catch {}
      }
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/plans', { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && Array.isArray(data.items)) setSavedPlans(data.items);
      } catch (e) {
        console.warn('Failed to fetch plans', e);
      }
    })();
  }, []);

  // Persist inputs
  useEffect(() => {
    localStorage.setItem('so_prefs', preferences);
  }, [preferences]);
  useEffect(() => {
    localStorage.setItem('so_icsUrl', icsUrl);
  }, [icsUrl]);
  useEffect(() => {
    localStorage.setItem('so_view', view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem('so_date', date);
  }, [date]);
  useEffect(() => {
    // keep local fallback copy
    localStorage.setItem('so_savedPlans', JSON.stringify(savedPlans));
  }, [savedPlans]);

  // Sync study technique across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'studyTechnique') setStudyTechnique(e.newValue || 'pomodoro25');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // File upload + validation + [1] file badge
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ics')) {
      setErr('Endast .ics-filer stöds.');
      return;
    }
    const maxMB = 2;
    if (file.size > maxMB * 1024 * 1024) {
      setErr(`Filen är för stor. Max ${maxMB} MB.`);
      return;
    }

    try {
      const text = await file.text();
      setIcsText(text);
      setIcsUrl('');
      setResult('');
      setErr('');
      setFileInfo({ name: file.name, size: file.size });
    } catch {
      setErr('Kunde inte läsa filen.');
    }
  };

  // Clear uploaded file
  const clearUploadedFile = () => {
    setIcsText('');
    setFileInfo(null);
  };

  // Drop handler
  const onDropZoneDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dropzone--active');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = e.currentTarget.querySelector('input[type="file"]');
    if (input) {
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Request plan
  const requestPlan = async (effectivePreferences, refineData = {}) => {
    setErr('');
    setStructured([]);
    setLoading(true);

    // Abort ongoing
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const urlClean = icsUrl.trim();
    const endpoint = '/api/plan';
    const base = {
      preferences: effectivePreferences,
      studyTechnique,
      useAI,
      view,
      date: view === 'daily' ? date : null,
      ...refineData,
    };
    const payload = icsText ? { icsText, ...base } : { icsUrl: urlClean, ...base };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error || data.ok === false) {
        throw new Error(data?.error || `Serverfel (${res.status})`);
      }
      setResult(data.plan || '');
      setStructured(Array.isArray(data.structured) ? data.structured : []);
      setMeta({ eventsCount: data.eventsCount || 0, usedAI: !!data.usedAI });
      setActiveTabId(null);
    } catch (e) {
      if (e.name === 'AbortError') return;
      const msg = e?.message || 'Tekniskt fel. Försök igen.';
      if (/timeout/i.test(msg)) setErr('Tjänsten tog för lång tid. Försök igen om en stund.');
      else if (/invalid url/i.test(msg)) setErr('Ogiltig kalenderlänk. Kontrollera att den är offentlig.');
      else setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!preferences.trim()) setErr('Fyll i dina preferenser.');
      else if (!icsText && !icsUrl.trim()) setErr('Ladda upp en fil eller ange en länk.');
      else if (icsUrl.trim() && !isValidUrl(icsUrl.trim())) setErr('Ogiltig länk. Kontrollera URL:en.');
      else if (view === 'daily' && !isValidDate(date)) setErr('Välj datum för dagsvy (YYYY-MM-DD).');
      return;
    }
    setResult('');
    await requestPlan(preferences);
  };

  // [4] AI suggest before generation
  const handleAISuggest = async () => {
    setAiErr('');
    const hasSource = !!icsText || !!icsUrl.trim();
    if (!preferences.trim()) {
      setAiErr('Skriv några preferenser först.');
      return;
    }
    if (!hasSource) {
      setAiErr('Ladda upp en .ics eller ange en kalenderlänk först.');
      return;
    }

    try {
      setAiLoading(true);
      const payload = {
        preferences,
        icsText: icsText || undefined,
        icsUrl: icsText ? undefined : icsUrl.trim(),
        studyTechnique,
        view,
        date: view === 'daily' ? date : null,
      };
      const res = await fetch('/api/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data?.error || 'Kunde inte hämta AI‑förslag');

      const suggestion = (data.suggestion || '').trim();
      setAiLastSuggestion(suggestion);

      if (suggestion) {
        setPreferences((prev) => {
          const pref = prev.trim();
          const addon = `\n\n[AI‑förslag att beakta]\n${suggestion}`;
          return pref ? pref + addon : suggestion;
        });
      }
    } catch (e) {
      setAiErr(e.message || 'Tekniskt fel vid AI‑förslag');
    } finally {
      setAiLoading(false);
    }
  };

  const regenerateWithNotes = async () => {
    if (!improvementNotes.trim()) {
      setErr('Skriv några anteckningar för att förbättra planen.');
      return;
    }
    await requestPlan(preferences, { notes: improvementNotes.trim() });
  };

  // [5] Save current plan via API if logged in, else localStorage
  const saveCurrentPlan = async () => {
    if (!result) return;
    const token = localStorage.getItem('token');
    const payload = {
      title: defaultPlanTitle(studyTechnique),
      plan: result,
      structured,
      meta,
    };
    if (!token) {
      const id = cryptoRandomId();
      const newPlan = { id, ...payload, createdAt: new Date().toISOString() };
      setSavedPlans((prev) => [newPlan, ...prev].slice(0, 50));
      setActiveTabId(id);
      return;
    }
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.item) throw new Error(data.error || 'Kunde inte spara planen');
      const saved = data.item;
      setSavedPlans(prev => [saved, ...prev].slice(0, 50));
      setActiveTabId(saved.id);
    } catch (e) {
      console.error('Save plan failed:', e);
    }
  };

  const loadSavedPlan = (plan) => {
    setActiveTabId(plan.id);
    setResult(plan.plan);
    setStructured(Array.isArray(plan.structured) ? plan.structured : []);
    setMeta(plan.meta || { eventsCount: 0, usedAI: false });
  };

  const removeSavedPlan = async (id) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedPlans((prev) => prev.filter((p) => p.id !== id));
      if (activeTabId === id) setActiveTabId(null);
      return;
    }
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunde inte ta bort plan');
      setSavedPlans((prev) => prev.filter((p) => p.id !== id));
      if (activeTabId === id) setActiveTabId(null);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const renameSavedPlan = async (id) => {
    const title = prompt('Namn på plan:');
    if (!title) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedPlans((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
      return;
    }
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok || !data.item) throw new Error(data.error || 'Kunde inte byta namn');
      setSavedPlans((prev) => prev.map((p) => (p.id === id ? data.item : p)));
    } catch (e) {
      console.error('Rename failed:', e);
    }
  };

  return (
    <div className={`opt-page${hideTitle ? ' embedded' : ''}`}>
      {!hideTitle && (
        <>
          <h1>Schedule Optimizer</h1>
          <p className="subtitle">
            Länka eller ladda upp ditt schema, skriv dina prioriteringar – få ett optimerat studieschema baserat på <b>{labelFromTechnique(studyTechnique)}</b>.
          </p>
        </>
      )}

      {/* [5] Tabs for saved plans */}
      {savedPlans.length > 0 && (
        <div className="tabs" style={{ marginBottom: 12 }}>
          <button
            className={`tab ${activeTabId ? '' : 'active'}`}
            onClick={() => setActiveTabId(null)}
            type="button"
            title="Nuvarande/nytt resultat"
          >
            Live
          </button>
          {savedPlans.map((p) => (
            <div key={p.id} className={`tab ${activeTabId === p.id ? 'active' : ''}`}>
              <button className="tab__btn" type="button" onClick={() => loadSavedPlan(p)} title={`${p.title}`}>
                {p.title}
              </button>
              <button className="tab__icon" type="button" onClick={() => renameSavedPlan(p.id)} title="Byt namn">
                ✏️
              </button>
              <button className="tab__icon" type="button" onClick={() => removeSavedPlan(p.id)} title="Ta bort">
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Result section with tabs (Plan / Export) */}
      {result && (
        <div className="result" ref={resultRef}>
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={`tab ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>
              Plan
            </button>
            <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
              Exportera
            </button>
          </div>

          <div className="meta">Hämtade händelser: {meta.eventsCount} • AI-förbättring: {meta.usedAI ? 'Ja' : 'Nej'}</div>

          {activeTab === 'plan' ? (
            <>
              <PlanResults textPlan={result} structuredEvents={structured} />
              <div className="actions plan-actions">
                <button className="primary" type="button" onClick={saveCurrentPlan} disabled={loading}>
                  Spara som plan
                </button>
              </div>
            </>
          ) : (
            <ExportCalendarTab structured={structured} calendarName="AI Study Plan" />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="opt-grid">
          <div className="card">
            <h2>
              1) Koppla schema <span className="info" title="Ladda upp en .ics-fil eller ange en kalenderlänk">ℹ</span>
            </h2>

            {/* DROPZONE (drag & drop + click) */}
            <label className="label">Ladda upp .ics</label>
            <div
              className="dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('dropzone--active');
              }}
              onDragLeave={(e) => e.currentTarget.classList.remove('dropzone--active')}
              onDrop={onDropZoneDrop}
            >
              <div className="dropzone__icon">.ics</div>
              <div className="dropzone__text">
                <div className="dropzone__title">Släpp .ics här eller klicka för att välja</div>
                <div className="dropzone__hint">Max 2MB. Endast .ics</div>
              </div>
              <input type="file" accept=".ics" onChange={handleFileUpload} disabled={loading} />
            </div>

            {/* [1] file badge */}
            {fileInfo && (
              <div className="file-badge">
                <span className="file-badge__name" title={fileInfo.name}>
                  {fileInfo.name}
                </span>
                <span className="file-badge__size">{prettySize(fileInfo.size)}</span>
                <button
                  type="button"
                  className="file-badge__remove"
                  onClick={clearUploadedFile}
                  aria-label="Ta bort fil"
                >
                  ✖
                </button>
              </div>
            )}

            <div className="or">eller</div>

            <label className="label">Länk till schema</label>
            <input
              type="url"
              placeholder="Klistra in valfri schema‑länk (TimeEdit, Kronox, Google...)"
              value={icsUrl}
              onChange={(e) => {
                setIcsUrl(e.target.value);
                setIcsText('');
                setFileInfo(null);
                setResult('');
                setErr('');
              }}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
              aria-disabled={loading}
            />

            {icsText && <div className="hint">En .ics‑fil är uppladdad. Länken ignoreras tills du tar bort filen.</div>}

            <div className="hint">Du kan använda export/prenumerationslänkar från Google Calendar, TimeEdit, Kronox m.fl.</div>
          </div>

          <div className="card">
            <h2>
              2) Preferenser <span className="info" title="Beskriv mål, tentor och tider du vill undvika. Lägg gärna till viktiga datum.">ℹ</span>
            </h2>

            {/* [3] Quick presets */}
            <div className="chips">
              {quickPresets.map((t, i) => (
                <button type="button" className="chip" key={i} onClick={() => addPreset(t)}>
                  {t}
                </button>
              ))}
            </div>

            <textarea
              rows={8}
              placeholder={`Exempel:\n- Tentor: Matte 2025-09-12, Mikroteori 2025-09-25\n- Prioritera repetition för Matte (kap 3–6)\n- Undvik sena kvällar efter 20:00\n- Lägg in längre pass på lördag fm\n`}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              disabled={loading}
              aria-disabled={loading}
            />

            <div className="row">
              <label className="label">Studieteknik</label>
              <select
                value={studyTechnique}
                onChange={(e) => {
                  setStudyTechnique(e.target.value);
                  localStorage.setItem('studyTechnique', e.target.value);
                }}
                disabled={loading}
                aria-disabled={loading}
              >
                <option value="pomodoro25">Pomodoro 25/5</option>
                <option value="pomodoro50">Pomodoro 50/10</option>
                <option value="deepwork">Deep Work (90/15)</option>
                <option value="timeblock">Time Blocking (60/10)</option>
                <option value="spaced">Spaced Repetition (30/5)</option>
                <option value="recall">Active Recall (30/5)</option>
              </select>
            </div>

            <div className="row">
              <label className="label">Vy</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="view"
                    value="weekly"
                    checked={view === 'weekly'}
                    onChange={() => setView('weekly')}
                    disabled={loading}
                  />{' '}
                  Vecka
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="view"
                    value="daily"
                    checked={view === 'daily'}
                    onChange={() => setView('daily')}
                    disabled={loading}
                  />{' '}
                  Dag
                </label>
                {view === 'daily' && (
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} aria-disabled={loading} />
                )}
              </div>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                disabled={loading}
                aria-disabled={loading}
              />
              Förbättra planen med AI
            </label>

            {/* [4] AI suggest prior to generation */}
            <div className="ai-suggest">
              <button className="secondary" type="button" onClick={handleAISuggest} disabled={aiLoading || loading}>
                {aiLoading ? 'Analyserar…' : 'Få AI‑förslag på förbättring'}
              </button>
              {aiErr && <div className="error" style={{ marginTop: 8 }}>{aiErr}</div>}
              {aiLastSuggestion && !aiErr && (
                <div className="hint" style={{ marginTop: 8 }}>
                  AI‑förslag har lagts till längst ned i preferenserna.
                </div>
              )}
            </div>

            <button className="primary" type="submit" disabled={loading || !canSubmit} aria-busy={loading}>
              {loading ? 'Genererar…' : 'Generera schema'}
            </button>

            {err && (
              <>
                <div className="error">{err}</div>
                <div className="actions">
                  <button className="primary" type="button" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Genererar…' : 'Försök igen'}
                  </button>
                </div>
              </>
            )}
          </div>

          {result && (
            <div className="card refine-card">
              <h2>
                3) Förbättra planen{' '}
                <span className="info" title="Skriv ändringar/önskemål och generera om för att låta AI justera planen.">
                  ℹ
                </span>
              </h2>
              <p className="hint">Skriv ändringar, önskemål eller detaljerade instruktioner. Klicka sedan på "Generera om".</p>
              <textarea
                rows={6}
                placeholder={`Exempel:\n- Lägg in extra repetition i matte tisdag kväll\n- Flytta engelska till torsdag fm\n- Undvik konflikter med jobb tis 17–20\n`}
                value={improvementNotes}
                onChange={(e) => setImprovementNotes(e.target.value)}
                disabled={loading}
                aria-disabled={loading}
              />
              <div className="actions">
                <button className="primary" type="button" onClick={regenerateWithNotes} disabled={loading}>
                  {loading ? 'Genererar…' : 'Generera om med anteckningar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// ===== helpers =====
function prettySize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

function defaultPlanTitle(studyTechnique) {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
  return `${labelFromTechnique(studyTechnique)} • ${stamp}`;
}
