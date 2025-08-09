import React from 'react';
import '../App.css';

export default function AboutPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <h1>Om AI Study Planner</h1>
          <p>Vårt mål är att göra planering enkel, smart och stressfri för studenter.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container feature-cards">
          <article className="card feature">
            <h3>Problemet vi löser</h3>
            <p>Flera scheman, många mål och begränsad tid. Vi hjälper dig prioritera rätt.</p>
          </article>
          <article className="card feature">
            <h3>Hur det funkar</h3>
            <p>Importera scheman → ange preferenser → få ett optimerat veckoupplägg.</p>
          </article>
          <article className="card feature">
            <h3>Vision</h3>
            <p>Personlig studieplanering som anpassas i realtid när livet händer.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
