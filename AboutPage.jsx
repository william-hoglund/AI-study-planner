import React, { useEffect } from 'react';
import './PageStyles.css';

export default function AboutPage() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="page about">
      <section className="page-hero page-banner reveal">
        <div className="container">
          <h1>Om Schedule Optimizer</h1>
          <p>Vi hjälper studenter planera smartare, fokusera bättre och stressa mindre – med AI i ryggen.</p>
        </div>
      </section>

      <section className="page-section reveal">
        <div className="container">
          <h2>Vad vi gör</h2>
          <div className="feature-cards">
            <article className="card feature">
              <img src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1200&auto=format&fit=crop" alt="Kalender och planering" />
              <h3>Samlar dina scheman</h3>
              <p>Importera från TimeEdit, Kronox, Google Calendar m.fl. som fil eller länk. Allt på ett ställe.</p>
            </article>
            <article className="card feature">
              <img src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1200&auto=format&fit=crop" alt="Optimerad studietid" />
              <h3>Optimerar din tid</h3>
              <p>Ange mål, tentor och preferenser – vi föreslår ett veckoupplägg som passar dina vanor.</p>
            </article>
            <article className="card feature">
              <img src="https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=1200&auto=format&fit=crop" alt="Fokus och momentum" />
              <h3>Skapar momentum</h3>
              <p>Pomodoro, Deep Work, Spaced Repetition och Active Recall – välj det som passar dig.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="page-section reveal">
        <div className="container grid-2">
          <article className="card">
            <h3>Hur det funkar</h3>
            <ol className="list">
              <li>Importera ditt schema (fil eller länk).</li>
              <li>Berätta vad som är viktigt: mål, tentor, preferenser.</li>
              <li>Välj en studieteknik som passar dig.</li>
              <li>Få en tydlig veckoplan – exportera till kalender.</li>
            </ol>
          </article>

          <article className="card">
            <h3>Vår vision</h3>
            <p>
              Personlig studieplanering som anpassas i realtid när livet händer. Vi vill göra det lättare att
              skapa vanor, nå mål och må bra längs vägen.
            </p>
            <ul className="list">
              <li>Fokus på enkelhet och tydlighet</li>
              <li>Tydliga prioriteringar och pauser</li>
              <li>Synka med din vardag – inte tvärtom</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="page-section reveal">
        <div className="container">
          <div className="card">
            <h3>Roadmap</h3>
            <ul className="list">
              <li>Kalender‑synk (Google/Apple/Outlook)</li>
              <li>Delade planer och studiegrupper</li>
              <li>Påminnelser i mobilen och fokus‑lägen</li>
            </ul>
            <p className="muted">Tips: Följ oss via Profil → Nyhetsbrev för att få uppdateringar.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
