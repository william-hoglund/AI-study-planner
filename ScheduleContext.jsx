import React, { createContext, useState, useEffect } from 'react';

export const ScheduleContext = createContext();

export const ScheduleProvider = ({ children }) => {
  const [schedule, setSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem('schedule') || '[]'); } catch { return []; }
  });
  const [priorities, setPriorities] = useState(() => {
    try { return JSON.parse(localStorage.getItem('priorities') || '[]'); } catch { return []; }
  });
  const [backendOk, setBackendOk] = useState(true);
  const [hasAI, setHasAI] = useState(false);

  // Initial sync from backend if available
  useEffect(() => {
    fetch('/health')
      .then(r => r.json())
      .then(info => { setBackendOk(info?.status === 'ok'); setHasAI(!!info?.hasAI); })
      .catch(() => { setBackendOk(false); setHasAI(false); });

    fetch('/api/schedule').then((res) => res.json()).then((data) => {
      if (Array.isArray(data)) { setSchedule(data); localStorage.setItem('schedule', JSON.stringify(data)); }
    }).catch(() => {});

    fetch('/api/priorities').then((res) => res.json()).then((data) => {
      if (Array.isArray(data)) { setPriorities(data); localStorage.setItem('priorities', JSON.stringify(data)); }
    }).catch(() => {});
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    localStorage.setItem('schedule', JSON.stringify(schedule));
  }, [schedule]);
  useEffect(() => {
    localStorage.setItem('priorities', JSON.stringify(priorities));
  }, [priorities]);

  const addScheduleItem = (item) => {
    setSchedule((prev) => [...prev, item]);
    fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    }).catch(() => {});
  };

  const updatePriorities = (newPriorities) => {
    setPriorities(newPriorities);
    fetch('/api/priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priorities: newPriorities }),
    }).catch(() => {});
  };

  return (
    <ScheduleContext.Provider value={{ schedule, priorities, backendOk, addScheduleItem, updatePriorities }}>
      {children}
    </ScheduleContext.Provider>
  );
};