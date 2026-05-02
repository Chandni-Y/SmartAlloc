import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs, limit } from 'firebase/firestore';
import { CircleUser, Activity, Trash2, LogOut, Bell, Mail } from 'lucide-react';

const Volunteer = () => {
  const [view, setView] = useState('login'); // 'login', 'register', 'profile'
  const [formData, setFormData] = useState({ name: '', phone: '', area: '', skill: '' });
  const [loginData, setLoginData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let unsubTasks, unsubNotifs;
    
    const fetchProfile = async () => {
      const savedId = localStorage.getItem('volunteerId');
      if (savedId) {
        try {
          const docRef = doc(db, 'volunteers', savedId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
            setView('profile');
            
            // 1. Listen for active tasks (Assigned)
            const qTasks = query(
              collection(db, 'problems'), 
              where('assignedVolunteerId', '==', savedId),
              where('status', '==', 'assigned')
            );
            unsubTasks = onSnapshot(qTasks, (s) => setMyTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));

            // 2. Listen for notifications (Pending dispatch to ME)
            const qNotifs = query(
              collection(db, 'problems'), 
              where('suggestedVolunteerId', '==', savedId),
              where('status', '==', 'pending')
            );
            unsubNotifs = onSnapshot(qNotifs, (s) => setNotifications(s.docs.map(d => ({ id: d.id, ...d.data() }))));

          } else {
            localStorage.removeItem('volunteerId');
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      }
      setLoading(false);
    };
    fetchProfile();
    return () => { 
      if (unsubTasks) unsubTasks(); 
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const q = query(
        collection(db, 'volunteers'), 
        where('name', '==', loginData.name), 
        where('phone', '==', loginData.phone), 
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("No volunteer found with these details. Please Register.");
      } else {
        const volId = snap.docs[0].id;
        localStorage.setItem('volunteerId', volId);
        window.location.reload();
      }
    } catch (e) {
      alert("Login Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const acceptDispatch = async (taskId) => {
    try {
      await updateDoc(doc(db, 'problems', taskId), { 
        status: 'assigned',
        assignedVolunteerId: profile.id,
        assignedVolunteerName: profile.name
      });
      alert("Invitation Accepted! Incident is now in progress.");
    } catch (e) {
      alert("Error accepting dispatch.");
    }
  };

  const completeTask = async (taskId) => {
    try {
      await updateDoc(doc(db, 'problems', taskId), { status: 'done' });
      alert("Mission accomplished!");
    } catch (e) {
      alert("Error completing task.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'volunteers'), {
        ...formData,
        status: 'available',
        joinedAt: serverTimestamp()
      });
      localStorage.setItem('volunteerId', docRef.id);
      window.location.reload();
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async () => {
    if (!profile) return;
    const newStatus = profile.status === 'available' ? 'busy' : 'available';
    setProfile(prev => ({ ...prev, status: newStatus }));
    try {
      await updateDoc(doc(db, 'volunteers', profile.id), { status: newStatus });
    } catch (e) {
      alert("Error updating status.");
      setProfile(prev => ({ ...prev, status: profile.status }));
    }
  };

  const deleteProfile = async () => {
    if (!window.confirm("Are you sure you want to delete your profile?")) return;
    try {
      await deleteDoc(doc(db, 'volunteers', profile.id));
      localStorage.removeItem('volunteerId');
      window.location.reload();
    } catch (e) {
      alert("Error deleting profile.");
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading Portal...</div>;

  if (profile && view === 'profile') {
    return (
      <div className="responsive-container">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>Responder Command Center</h1>
          <p style={{ color: 'var(--text-dim)' }}>Welcome back, {profile.name}.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* Notifications / Dispatch Invitations */}
          {notifications.length > 0 && (
            <div className="glass-card" style={{ border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
              <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                <Bell size={20} className="animate-pulse" />
                New Dispatch Invitation ({notifications.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ padding: '1.2rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.75rem', border: '1px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>{notif.location}</h4>
                      <span className={`priority-badge priority-${notif.priority}`}>{notif.priority}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{notif.description}</p>
                    <button onClick={() => acceptDispatch(notif.id)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
                      Accept Dispatch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
            <CircleUser size={64} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
            <h2 style={{ marginBottom: '0.5rem' }}>{profile.name}</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>{profile.skill} • {profile.area}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={toggleStatus} style={{ 
                padding: '1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: profile.status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: profile.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                <Activity size={20} />
                {profile.status === 'available' ? 'I am Ready to Deploy' : 'I am Busy / Off-duty'}
              </button>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button onClick={() => { localStorage.removeItem('volunteerId'); window.location.reload(); }} style={{ 
                  padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}>
                  <LogOut size={18} /> Logout
                </button>
                <button onClick={deleteProfile} style={{ 
                  padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.5)', background: 'transparent', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}>
                  <Trash2 size={18} /> Delete
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} style={{ color: 'var(--accent-green)' }} />
              Active Missions ({myTasks.length})
            </h3>
            {myTasks.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>No active missions. Invitations will appear here when you are dispatched.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {myTasks.map(task => (
                  <div key={task.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>{task.location}</h4>
                      <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>{task.description}</p>
                    <button onClick={() => completeTask(task.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--accent-green)' }}>
                      Mission Complete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="responsive-container">
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>Volunteer Portal</h1>
          <p style={{ color: 'var(--text-dim)' }}>Login to view your dispatch notifications.</p>
        </header>
        <div className="glass-card">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Full Name</label>
              <input required type="text" placeholder="e.g. John Doe" value={loginData.name} onChange={e => setLoginData({...loginData, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input required type="tel" placeholder="e.g. 1234567890" value={loginData.phone} onChange={e => setLoginData({...loginData, phone: e.target.value})} />
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Verifying...' : 'Login to Portal'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            New volunteer? <button onClick={() => setView('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Register Now</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="responsive-container">
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Volunteer Registration</h1>
        <p style={{ color: 'var(--text-dim)' }}>Join the rapid response community.</p>
      </header>
      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Area / Neighborhood</label>
            <input required type="text" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Primary Skill</label>
            <select required value={formData.skill} onChange={e => setFormData({...formData, skill: e.target.value})}>
              <option value="">Select expertise</option>
              <option value="Construction">Construction</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Medical">Medical</option>
              <option value="Electrician">Electrician</option>
              <option value="General">General Support</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Registering...' : 'Join Response Team'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Already registered? <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login Here</button>
        </p>
      </div>
    </div>
  );
};

export default Volunteer;
