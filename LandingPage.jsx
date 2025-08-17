import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <h1>Planera smartare. Studera lugnare.</h1>
            <p>Samla alla scheman, lägg dina preferenser – få en AI‑optimerad plan på sekunder.</p>
            <div className="cta-row">
              <button className="cta-button" onClick={() => navigate('/schedule-optimizer')}>
                Kom igång gratis
              </button>
              <Link to="/about" className="cta-secondary">Läs mer</Link>
            </div>
            <div className="badges">
              <span>⚡ Snabb start</span>
              <span>🧠 Pomodoro & spaced repetition</span>
              <span>📅 Export till kalender</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="glass-card">
              <div className="glass-row">
                <span className="dot" />
                <span className="bar" />
              </div>
              <div className="glass-grid">
                <div className="block" />
                <div className="block tall" />
                <div className="block" />
                <div className="block wide" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Varför Schedule Optimizer?</h2>
          <div className="feature-cards">
            <article className="card feature">
              <h3>Importera scheman</h3>
              <p>TimeEdit, Kronox, Google Calendar m.fl. – ladda upp fil eller klistra in länk.</p>
            </article>
            <article className="card feature">
              <h3>AI‑optimering</h3>
              <p>Ange mål, tentor och preferenser. Vi föreslår ett smart veckoupplägg.</p>
            </article>
            <article className="card feature">
              <h3>Export & påminnelser</h3>
              <p>Synka till kalendern och få påminnelser för fokus och pauser.</p>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
