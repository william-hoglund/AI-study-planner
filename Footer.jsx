import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Footer(){
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-left">© {new Date().getFullYear()} Schedule Optimizer</div>
        <nav className="footer-nav">
          <Link to="/schedule-optimizer">Schedule Optimizer</Link>
          <Link to="/about">Om</Link>
          <Link to="/contact">Kontakt</Link>
          <Link to="/profile">Profil</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
      </div>
    </footer>
  );
}
