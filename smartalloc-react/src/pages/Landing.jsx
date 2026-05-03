import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Map, Zap, CheckCircle, ArrowRight, Shield, Clock, Users } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade">
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '6rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '0.5rem 1rem',
          borderRadius: '2rem',
          color: 'var(--primary)',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          marginBottom: '1rem'
        }}>
          <Shield size={16} /> Community Crisis Management
        </div>
        
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
          fontWeight: '800', 
          lineHeight: '1.1',
          color: 'var(--text-primary)',
          maxWidth: '800px'
        }}>
          Smart Help, <br /> <span style={{color: 'var(--primary)'}}>When It Matters Most</span>
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--text-dim)', 
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          A unified civic-tech platform empowering communities to report crises and automatically allocating the right resources in real-time.
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={() => navigate('/report')} 
            className="btn-primary"
            style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}
          >
            Report a Problem <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '2rem',
        padding: '3rem 1rem',
        background: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid var(--glass-border)',
        borderBottom: '1px solid var(--glass-border)',
        textAlign: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>500+</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 'bold' }}>Problems Resolved</p>
        </div>
        <div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-green)', marginBottom: '0.5rem' }}>200+</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 'bold' }}>Active Responders</p>
        </div>
        <div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--accent-red)', marginBottom: '0.5rem' }}>10+</h2>
          <p style={{ color: 'var(--text-dim)', fontWeight: 'bold' }}>Neighborhoods Saved</p>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '6rem 1rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.2rem', marginBottom: '4rem', fontWeight: 'bold' }}>Our Response Ecosystem</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--accent-red)' }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>1. Report</h3>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.6' }}>Citizens submit crisis details with location and media. Our AI instantly analyzes and prioritizes the situation.</p>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--primary)' }}>
              <Zap size={32} className="animate-pulse" />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>2. Allocate</h3>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.6' }}>SmartAlloc auto-dispatches notifications to qualified volunteers nearby based on specific expertise.</p>
          </div>
          
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ marginBottom: '1rem' }}>3. Resolve</h3>
            <p style={{ color: 'var(--text-dim)', lineHeight: '1.6' }}>Responders accept missions and execute solutions, keeping the community updated via the live map.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '4rem 1rem', 
        marginTop: '4rem',
        borderTop: '1px solid var(--glass-border)',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Shield size={28} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>SmartAlloc</span>
        </div>
        <p style={{ marginBottom: '1.5rem' }}>Empowering communities through AI-driven resource allocation.</p>
        <p style={{ fontSize: '0.8rem' }}>&copy; {new Date().getFullYear()} SmartAlloc Civic-Tech. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
