// index.js — Express backend (ESM)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Polyfill för fetch om Node < 18
if (typeof fetch === 'undefined') {
  const { default: nodeFetch } = await import('node-fetch');
  global.fetch = (...args) => nodeFetch(...args);
}

const app = express();

// ---- Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// ---- Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'schedule-optimizer', ts: new Date().toISOString() });
});

/**
 * /api/ai-suggest
 * Body: { preferences, icsText?, icsUrl?, studyTechnique, view, date? }
 * Res:  { ok: true, suggestion } | { error }
 */
app.post('/api/ai-suggest', async (req, res) => {
  try {
    const {
      preferences = '',
      icsText = '',
      icsUrl = '',
      studyTechnique = '',
      view = 'weekly',
      date = null,
    } = req.body || {};

    if (!preferences.trim()) {
      return res.status(400).json({ error: 'Skriv preferenser först.' });
    }

    const baseContext =
`Preferenser:
${preferences}

Källa: ${icsText ? 'ICS-text bifogad' : (icsUrl ? icsUrl : 'saknas')}
Teknik: ${studyTechnique}
Vy: ${view}${view === 'daily' && date ? ` (${date})` : ''}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const prompt =
`Du är en hjälpsam studieplanerare. Läs användarens preferenser och föreslå 3–5 korta, konkreta förbättringar (punktlista) för att stärka planen.
Fokusera på prioritering, balans vila/studier och tidsblock. Svara på svenska, max 80 ord.

${baseContext}`;

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Du skriver koncisa förbättringsförslag på svenska.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 220,
        }),
      });

      const data = await r.json().catch(() => ({}));
      const suggestion = data?.choices?.[0]?.message?.content?.trim();
      if (r.ok && suggestion) {
        return res.json({ ok: true, suggestion });
      }
      // fallthrough
    }

    // Fallback-heuristik
    const tips = [];
    if (/tent|prov|exam/i.test(preferences)) tips.push('Planera 2× 90-minuters pass per ämne dagligen sista 7 dagarna före tentan.');
    if (/kväll|20:00|sen/i.test(preferences)) tips.push('Lägg tunga pass 09–12; håll eftermiddagar lättare och undvik efter 20:00.');
    if (String(studyTechnique).includes('pomodoro')) tips.push('Kör 4 pomodoros följt av en längre paus (20–30 min) efter block.');
    if (!tips.length) tips.push('Inför daglig snabb repetition (15 min) i slutet av dagen för att förstärka minnet.');

    return res.json({ ok: true, suggestion: `- ${tips.join('\n- ')}` });
  } catch (e) {
    console.error('/api/ai-suggest error:', e);
    return res.status(500).json({ error: 'Kunde inte ta fram AI‑förslag.' });
  }
});

// Din /api/plan kan ligga här
// app.post('/api/plan', async (req, res) => { ... });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
