import React, { useContext, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';
import { ScheduleContext } from '../context/ScheduleContext.jsx';

function Navbar() {
  const { backendOk } = useContext(ScheduleContext);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (backendOk) setStatus('Connected to backend');
    else setStatus('Offline (using local data)');
  }, [backendOk]);

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <a href="/" className="navbar-logo">Schedule Optimizer</a>

        <div className="navbar-links">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>Home</NavLink>
          <NavLink to="/schedule-optimizer" className={({isActive}) => isActive ? 'active' : ''}>Schedule Optimizer</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'active' : ''}>About</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? 'active' : ''}>Contact</NavLink>
        </div>

        <div className="navbar-profile" title={status}>
          <span className="user-icon" aria-label={status}>●</span>
          <a className="profile-link" href="/profile" aria-label="Open profile">
            <span className="user-icon">👤</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
