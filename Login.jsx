import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      navigate('/schedule-optimizer');
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="page">
      <section className="page-section">
        <div className="container" style={{ maxWidth: 480 }}>
          <div className="card">
            <h2>Logga in</h2>
            <form className="stack" onSubmit={submit}>
              <input className="ui-input" placeholder="E‑post" value={email} onChange={e=>setEmail(e.target.value)} />
              <input className="ui-input" type="password" placeholder="Lösenord" value={password} onChange={e=>setPassword(e.target.value)} />
              {err && <div className="error">{err}</div>}
              <button className="primary" type="submit">Logga in</button>
              <small className="muted">Har du inget konto? <Link to="/register">Registrera dig</Link></small>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
