import React, { useState, useEffect, useMemo } from 'react';
import './PageStyles.css';
import GoalCalendar from '../components/GoalCalendar.jsx';

const TECH_OPTIONS = [
  { value: 'pomodoro25', label: 'Pomodoro 25/5', desc: '25 min fokus + 5 min paus. Längre paus varje 4:e pass.' },
  { value: 'pomodoro50', label: 'Pomodoro 50/10', desc: '50 min fokus + 10 min paus. Bra för längre fokusblock.' },
  { value: 'spaced',      label: 'Spaced Repetition', desc: 'Återkommande repetition med ökande intervaller.' },
  { value: 'recall',      label: 'Active Recall', desc: 'Aktiv återkallning: testa dig själv utan stöd.' },
  { value: 'timeblock',   label: 'Time Blocking', desc: 'Schemalägg fasta block för olika ämnen.' },
  { value: 'deepwork',    label: 'Deep Work', desc: 'Störningsfri tid i längre block (60–90 min).' },
];

export default function ProfilePage() {
  const [goals, setGoals] = useState([]);
  const [draft, setDraft] = useState({ text: '', date: '' });
  const [studyTechnique, setStudyTechnique] = useState('pomodoro25');

  useEffect(() => {
    try {
      const storedGoals = JSON.parse(localStorage.getItem('userGoals') || '[]');
      setGoals(Array.isArray(storedGoals) ? storedGoals : []);
    } catch {}
    const storedTechnique = localStorage.getItem('studyTechnique');
    if (storedTechnique) setStudyTechnique(storedTechnique);
  }, []);

  useEffect(() => { localStorage.setItem('userGoals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('studyTechnique', studyTechnique); }, [studyTechnique]);

  const techniqueDesc = useMemo(
    () => TECH_OPTIONS.find(t => t.value === studyTechnique)?.desc || '',
    [studyTechnique]
  );

  const addGoal = () => {
    const text = draft.text.trim();
    if (!text) return;
    setGoals(prev => [...prev, { id: crypto.randomUUID(), text, date: draft.date || '', editing: false }]);
    setDraft({ text: '', date: '' });
  };

  const toggleEdit = (id) => setGoals(prev => prev.map(g => g.id === id ? { ...g, editing: !g.editing } : g));
  const saveEdit = (id, next) => setGoals(prev => prev.map(g => g.id === id ? { ...g, ...next, editing: false } : g));
  const removeGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  return (
    <div className="page">
      <section className="page-hero page-banner">
        <div className="container">
          <h1>Din profil</h1>
          <p>Spara preferenser och mål som påverkar AI‑optimeringen.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container grid-2">
          <article className="card">
            <h3>👤 Konto</h3>
            <div className="stack">
              <div className="ui-input" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>E‑post</span>
                <strong>demo@user.app</strong>
              </div>
              <div className="ui-input" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span>Status</span>
                <span className="muted">Ej kopplad</span>
              </div>
              <button className="ghost" disabled>Hantera konto (snart)</button>
            </div>
          </article>

          <article className="card">
            <h3>⚙️ Studieteknik</h3>
            <p>Välj standardteknik för schemageneratorn.</p>
            <div className="stack">
              <select className="ui-input" value={studyTechnique} onChange={(e) => setStudyTechnique(e.target.value)}>
                {TECH_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <small className="muted">{techniqueDesc}</small>
            </div>
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="container grid-2">
          <article className="card">
            <h3>🔔 Notiser</h3>
            <p className="muted">Kommer snart: Pushnotiser för fokuspass och pauser.</p>
            <button className="ghost" disabled>Aktivera push (snart)</button>
          </article>

          <article className="card">
            <h3>📅 Kalendrar</h3>
            <ul className="list">
              <li>Google Calendar – ej kopplad</li>
              <li>Apple Calendar – ej kopplad</li>
              <li>Outlook – ej kopplad</li>
            </ul>
            <button className="ghost" disabled>Koppla kalender (snart)</button>
          </article>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <h2>🎯 Mina mål</h2>

          <div className="card">
            <div className="goal-new stack">
              <div className="goal-inputs">
                <input className="ui-input" type="text" placeholder="Ex: Klara fysik‑tentan"
                  value={draft.text} onChange={(e) => setDraft(d => ({ ...d, text: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && addGoal()} />
                <input className="ui-input" type="date"
                  value={draft.date} onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))} />
                <button className="primary" onClick={addGoal}>Lägg till mål</button>
              </div>
              <small className="muted">Tips: Ange ett datum så syns målet i månadsöversikten.</small>
            </div>

            <ul className="goal-list">
              {goals.length === 0 && <li className="muted">Inga mål ännu.</li>}

              {goals.map(g => (
                <li key={g.id} className="goal-item">
                  {g.editing ? (
                    <GoalEditRow goal={g} onCancel={() => toggleEdit(g.id)} onSave={(next) => saveEdit(g.id, next)} />
                  ) : (
                    <GoalViewRow goal={g} onEdit={() => toggleEdit(g.id)} onRemove={() => removeGoal(g.id)} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="card">
            <GoalCalendar goals={goals} />
          </div>
        </div>
      </section>
    </div>
  );
}

function GoalViewRow({ goal, onEdit, onRemove }) {
  return (
    <div className="goal-row">
      <div className="goal-main">
        <span className="goal-check">✅</span>
        <div>
          <div className="goal-text">{goal.text}</div>
          {goal.date && <div className="goal-date muted">Deadline: {goal.date}</div>}
        </div>
      </div>
      <div className="goal-actions">
        <button className="ghost" onClick={onEdit}>Ändra</button>
        <button className="danger" onClick={onRemove}>Ta bort</button>
      </div>
    </div>
  );
}

function GoalEditRow({ goal, onCancel, onSave }) {
  const [text, setText] = useState(goal.text || '');
  const [date, setDate] = useState(goal.date || '');
  return (
    <div className="goal-row">
      <div className="goal-main">
        <span className="goal-check">✏️</span>
        <div className="goal-edit-grid">
          <input className="ui-input" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Målbeskrivning" />
          <input className="ui-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="goal-actions">
        <button className="ghost" onClick={onCancel}>Avbryt</button>
        <button className="primary" onClick={() => onSave({ text: text.trim(), date })}>Spara</button>
      </div>
    </div>
  );
}
