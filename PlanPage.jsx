import React from 'react';
import './PageStyles.css';
import ScheduleOptimizer from '../components/ScheduleOptimizer.jsx';

export default function PlanPage() {
  return (
    <div className="page">
      <section className="page-hero page-banner">
        <div className="container">
          <h1>Schedule Optimizer</h1>
          <p>Importera schema, ange preferenser och låt oss föreslå en tydlig plan.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="card">
            <ScheduleOptimizer hideTitle={true} />
          </div>
        </div>
      </section>
    </div>
  );
}
