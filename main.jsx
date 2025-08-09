import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { ScheduleProvider } from './context/ScheduleContext.jsx'; // Importera Context

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ScheduleProvider>
        <App />
      </ScheduleProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found. Please check your HTML file.');
}
