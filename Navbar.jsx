import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <a href="/" className="navbar-logo">AI Study Planner</a>

        <div className="navbar-links">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>Home</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'active' : ''}>About</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? 'active' : ''}>Contact</NavLink>
          <NavLink to="/schedule-optimizer" className={({isActive}) => isActive ? 'active' : ''}>Plan</NavLink>
        </div>

        <div className="navbar-profile">
          <a className="profile-link" href="/profile" aria-label="Open profile">
            <span className="user-icon">👤</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
