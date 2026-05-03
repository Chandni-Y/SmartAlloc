import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ShieldCheck, Mail, Lock, UserCircle, ArrowRight, ShieldAlert, LogIn, UserPlus } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '1000px', margin: '4rem auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', padding: '0 2rem', alignItems: 'center' }}>
      
      {/* Branding Side */}
      <div style={{ textAlign: 'left' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1.2rem', borderRadius: '2rem', marginBottom: '2rem' }}>
          <ShieldCheck size={16} /> SMARTALLOC SECURITY
        </div>
        <h1 style={{ fontSize: '3rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '1.5rem' }}>Secure Access <br /> <span style={{ color: 'var(--primary)' }}>Control Portal</span></h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          Authenticated entry for responders, citizens, and administration. Join the network to contribute to real-time crisis management.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>Real-time Dispatch</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Instant sync with global response map.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <UserCircle size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>Verified Profiles</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Reputation tracking for all responders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="glass-card" style={{ padding: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{isLogin ? 'Enter your credentials to continue' : 'Register for authorized portal access'}</p>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Work/Personal Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', top: '50%', left: '1.2rem', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: '3rem' }} placeholder="you@example.com" />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', top: '50%', left: '1.2rem', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ paddingLeft: '3rem' }} placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '1.2rem' }}>
            {loading ? 'Authenticating...' : (isLogin ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Access Portal <LogIn size={18}/></span> : <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Create Account <UserPlus size={18}/></span>)}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
          <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '900' }}>OAUTH ACCESS</span>
          <hr style={{ flex: 1, borderColor: 'var(--glass-border)' }} />
        </div>

        <button onClick={handleGoogleSignIn} className="btn-primary" style={{ background: 'white', color: '#111', fontWeight: '800' }}>
          <UserCircle size={20} />
          Continue with Google
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-dim)', marginTop: '2.5rem' }}>
          {isLogin ? "First time here? " : "Already registered? "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '900', textDecoration: 'underline' }}>
            {isLogin ? 'Sign Up Now' : 'Log In Instead'}
          </button>
        </p>
      </div>

    </div>
  );
};

export default Login;
