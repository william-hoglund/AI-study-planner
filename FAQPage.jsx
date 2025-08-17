import React from 'react';
import './PageStyles.css';
import { Link } from 'react-router-dom';

export default function FAQPage() {
  return (
    <div className="page">
      <section className="page-hero page-banner">
        <div className="container">
          <h1>FAQ & Hjälp</h1>
          <p>Vanliga frågor och nyttig information om Schedule Optimizer.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container grid-2">
          <article className="card">
            <h3>Kom igång</h3>
            <ul className="list">
              <li>Hur importerar jag TimeEdit/Kronox? — Ladda upp .ics eller klistra in länk under Schedule Optimizer.</li>
              <li>Vad kostar tjänsten? — Börja gratis. Betalplan kommer senare.</li>
              <li>Hur exporterar jag planen? — När schema genererats kan du exportera till kalender (kommer snart).</li>
            </ul>
          </article>
          <article className="card">
            <h3>Länkar</h3>
            <ul className="list">
              <li><Link to="/schedule-optimizer">Schedule Optimizer</Link></li>
              <li><Link to="/contact">Kontakt</Link></li>
              <li><Link to="/about">Om</Link></li>
              <li><Link to="/profile">Profil</Link></li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
