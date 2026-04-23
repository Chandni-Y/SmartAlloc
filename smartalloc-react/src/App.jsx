import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MapPin, LayoutDashboard, UserPlus, Upload, ShieldCheck } from 'lucide-react';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Volunteer from './pages/Volunteer';
import NgoUpload from './pages/NgoUpload';

const Navbar = () => {
  const location = useLocation();
  
  const NavLink = ({ to, icon: Icon, children }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
        className={`nav-link ${isActive ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
      >
        <Icon size={18} />
        <span>{children}</span>
      </Link>
    );
  };

  return (
    <nav>
      <Link to="/" className="logo">
        <ShieldCheck size={28} />
        <span>SmartAlloc</span>
      </Link>
      <div className="nav-links">
        <NavLink to="/" icon={MapPin}>Report Issue</NavLink>
        <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
        <NavLink to="/volunteer" icon={UserPlus}>Volunteer</NavLink>
        <NavLink to="/ngo-upload" icon={Upload}>NGO Upload</NavLink>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="container animate-fade">
        <Navbar />
        <main style={{ marginTop: '2rem' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/ngo-upload" element={<NgoUpload />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
