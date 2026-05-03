import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useLocation, Navigate } from 'react-router-dom';
import { MapPin, LayoutDashboard, UserPlus, Upload, ShieldCheck, Users, AlertTriangle, LogOut, Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

import Landing from './pages/Landing';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Volunteer from './pages/Volunteer';
import VolunteerList from './pages/VolunteerList';
import NgoUpload from './pages/NgoUpload';
import Login from './pages/Login';
import ProblemDetail from './pages/ProblemDetail';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

const ThemeSwitcher = () => {
  const { themePref, setThemePref } = useTheme();

  return (
    <div className="theme-switcher">
      <button className={`theme-btn ${themePref === 'light' ? 'active' : ''}`} onClick={() => setThemePref('light')} title="Light Mode">
        <Sun size={18} />
      </button>
      <button className={`theme-btn ${themePref === 'dark' ? 'active' : ''}`} onClick={() => setThemePref('dark')} title="Dark Mode">
        <Moon size={18} />
      </button>
      <button className={`theme-btn ${themePref === 'system' ? 'active' : ''}`} onClick={() => setThemePref('system')} title="System Theme">
        <Monitor size={18} />
      </button>
    </div>
  );
};

const NavigationDrawer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
    window.location.reload();
  };

  const DrawerLink = ({ to, icon: Icon, children }) => {
    return (
      <NavLink 
        to={to} 
        end={to === '/'}
        className="drawer-link"
        style={({ isActive }) => (isActive ? {
          color: 'var(--sidebar-active-text)',
          borderLeftColor: 'var(--sidebar-active-border)',
          background: 'var(--sidebar-active-bg)'
        } : {})}
        onClick={() => setIsOpen(false)}
      >
        <Icon size={20} />
        <span>{children}</span>
      </NavLink>
    );
  };

  return (
    <>
      <nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setIsOpen(true)} 
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={28} />
          </button>
          <Link to="/" className="logo">
            <ShieldCheck size={28} style={{ color: 'var(--primary)' }} />
            <span>SmartAlloc</span>
          </Link>
        </div>
        <div className="nav-actions">
          <ThemeSwitcher />
        </div>
      </nav>

      {createPortal(
        <>
          <div 
            className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
            onClick={() => setIsOpen(false)}
          ></div>

          <div className={`side-drawer ${isOpen ? 'open' : ''}`}>
            <div className="drawer-header">
              <div className="logo" style={{ fontSize: '1.2rem' }}>
                <ShieldCheck size={24} style={{ color: 'var(--primary)' }} />
                <span>SmartAlloc</span>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="drawer-links">
              <DrawerLink to="/" icon={ShieldCheck}>Home</DrawerLink>
              <DrawerLink to="/report" icon={AlertTriangle}>Report Issue</DrawerLink>
              <DrawerLink to="/dashboard" icon={LayoutDashboard}>Live Dashboard</DrawerLink>
              <DrawerLink to="/volunteer-list" icon={Users}>Responder Directory</DrawerLink>
              <DrawerLink to="/volunteer" icon={UserPlus}>My Volunteer Portal</DrawerLink>
              <DrawerLink to="/ngo-upload" icon={Upload}>NGO Bulk Sync</DrawerLink>
              
              <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--sidebar-border)' }}>
                {currentUser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>Signed in as: {currentUser.email}</div>
                    <button onClick={handleLogout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)} className="btn-primary" style={{ textDecoration: 'none' }}>
                    Sign In / Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

function AppRoutes() {
  return (
    <div className="container animate-fade">
      <NavigationDrawer />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/report" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/problem/:id" element={<ProblemDetail />} />
          <Route path="/volunteer" element={<Volunteer />} />
          <Route path="/volunteer-list" element={<VolunteerList />} />
          <Route path="/ngo-upload" element={<NgoUpload />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
