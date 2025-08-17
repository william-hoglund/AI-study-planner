import React, { useState } from 'react';
import './PageStyles.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    // Här kan du koppla mot backend/mailtjänst. Nu visar vi bara ett kvitto.
    setSent(true);
  };

  return (
    <div className="page">
      <section className="page-hero page-banner">
        <div className="container">
          <h1>Kontakta oss</h1>
          <p>Frågor, idéer eller feedback? Vi svarar vanligtvis inom 24–48 timmar.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container grid-2">
          <div className="card form-card">
            <h3>Skicka meddelande</h3>
            {sent ? (
              <p>Tack! Ditt meddelande har skickats. Vi återkommer så snart vi kan.</p>
            ) : (
              <form onSubmit={onSubmit} className="stack" style={{maxWidth:'640px'}}>
                <label>
                  Namn
                  <input className="ui-input" name="name" value={form.name} onChange={onChange} placeholder="Ditt namn" required />
                </label>
                <label>
                  E‑post
                  <input className="ui-input" type="email" name="email" value={form.email} onChange={onChange} placeholder="din@mail.se" required />
                </label>
                <label>
                  Meddelande
                  <textarea className="ui-input" name="message" rows={8} value={form.message} onChange={onChange} placeholder="Hur kan vi hjälpa dig?" required />
                </label>
                <button className="primary" style={{alignSelf:'flex-start'}}>Skicka</button>
              </form>
            )}
          </div>

          <div className="card">
            <h3>Snabb info</h3>
            <ul className="list">
              <li>📧 support@aistudyplanner.app</li>
              <li>💬 Svarstid: inom 24–48h</li>
              <li>📍 Remote‑team (EU)</li>
            </ul>
            <h4>Vanliga frågor</h4>
            <ul className="list">
              <li>Hur importerar jag TimeEdit/Kronox? — Ladda upp .ics eller klistra in länk på Schedule Optimizer‑sidan.</li>
              <li>Vad kostar tjänsten? — Du kan börja gratis. Betalplan kommer senare.</li>
              <li>Hur raderas mina data? — Gå till Profil → Kontoinställningar (kommande).</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
