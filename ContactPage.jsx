import React, { useState } from 'react';
import '../App.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => { e.preventDefault(); setSent(true); };

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <h1>Kontakta oss</h1>
          <p>Frågor, idéer eller feedback? Hör av dig!</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container grid-2">
          <div className="card form-card">
            <h3>Skicka meddelande</h3>
            {sent ? (
              <p>Tack! Vi återkommer så snart vi kan.</p>
            ) : (
              <form onSubmit={onSubmit} className="stack">
                <label>
                  Namn
                  <input name="name" value={form.name} onChange={onChange} placeholder="Ditt namn" />
                </label>
                <label>
                  E‑post
                  <input name="email" value={form.email} onChange={onChange} placeholder="din@mail.se" />
                </label>
                <label>
                  Meddelande
                  <textarea name="message" rows={5} value={form.message} onChange={onChange} placeholder="Hur kan vi hjälpa dig?" />
                </label>
                <button className="primary">Skicka</button>
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
          </div>
        </div>
      </section>
    </div>
  );
}
