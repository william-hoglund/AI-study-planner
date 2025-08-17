import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ScheduleOptimizer from './components/ScheduleOptimizer.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
// import PlanPage from './pages/PlanPage.jsx';
import FAQPage from './pages/FAQPage.jsx';
import Footer from './components/Footer.jsx';
import './App.css';
import './components/Navbar.css';
import './pages/PageStyles.css';

function App() {
  return (
    <Router>
      <div className="App" style={{ paddingTop: '60px' }}>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/schedule-optimizer" element={<ScheduleOptimizer />} />
          <Route path="/plan" element={<Navigate to="/schedule-optimizer" replace />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
