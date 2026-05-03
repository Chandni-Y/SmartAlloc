import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs, limit, orderBy } from 'firebase/firestore';
import { CircleUser, Activity, Trash2, LogOut, Bell, Mail, ShieldCheck, MapPin, Wrench, Phone, ArrowRight, UserPlus, LogIn, CheckCircle, Clock, History } from 'lucide-react';

const AuthWrapper = ({ title, desc, icon: Icon, children, footer }) => (
  <div style={{ maxWidth: '450px', margin: '4rem auto', padding: '0 1rem' }}>
    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
      <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', margin: '0 auto 1.5rem', border: '1px solid var(--glass-border)' }}>
        <Icon size={32} />
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{title}</h1>
      <p style={{ color: 'var(--text-dim)' }}>{desc}</p>
    </div>
    <div className="glass-card" style={{ padding: '2.5rem' }}>
      {children}
      {footer}
    </div>
  </div>
);

const Volunteer = () => {
  const [view, setView] = useState('login');
  const [formData, setFormData] = useState({ name: '', phone: '', area: '', skills: [] });
  const [loginData, setLoginData] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);

  // Three task states
  const [notifications, setNotifications] = useState([]); // Pending + Skill Match
  const [activeTasks, setActiveTasks] = useState([]);   // Status: assigned + Me
  const [historyTasks, setHistoryTasks] = useState([]); // Status: done + Me

  const skillOptions = [
    "Construction", "Plumbing", "Cleaning", "Medical", "Electrician", "General",
    "Search & Rescue", "Firefighting", "First Aid", "Driving", "Counseling", "Communication"
  ];

  useEffect(() => {
    let unsubPending, unsubActive, unsubHistory;
    const fetchProfile = async () => {
      const savedId = localStorage.getItem('volunteerId');
      if (savedId) {
        try {
          const docRef = doc(db, 'volunteers', savedId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const volData = { id: docSnap.id, ...docSnap.data() };
            if (!volData.skills) volData.skills = volData.skill ? [volData.skill] : ['General'];
            setProfile(volData);
            setView('profile');

            // 1. Notifications: Global Pending reports matching MY skills
            const qPending = query(collection(db, 'problems'), where('status', '==', 'pending'));
            unsubPending = onSnapshot(qPending, (s) => {
              const all = s.docs.map(d => ({ id: d.id, ...d.data() }));
              setNotifications(all.filter(p => (volData.skills || []).includes(p.requiredSkill)));
            });

            // 2. Active: Reports assigned to ME
            const qActive = query(collection(db, 'problems'), where('assignedVolunteerId', '==', savedId), where('status', '==', 'assigned'));
            unsubActive = onSnapshot(qActive, (s) => setActiveTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));

            // 3. History: Reports completed by ME
            const qHistory = query(collection(db, 'problems'), where('assignedVolunteerId', '==', savedId), where('status', '==', 'done'));
            unsubHistory = onSnapshot(qHistory, (s) => setHistoryTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));

          } else {
            localStorage.removeItem('volunteerId');
          }
        } catch (err) {
          console.error(err);
        }
      }
      setLoading(false);
    };
    fetchProfile();
    return () => { unsubPending?.(); unsubActive?.(); unsubHistory?.(); };
  }, []);

  const acceptDispatch = async (taskId) => {
    try {
      await updateDoc(doc(db, 'problems', taskId), {
        status: 'assigned',
        assignedVolunteerId: profile.id,
        assignedVolunteerName: profile.name,
        assignedAt: serverTimestamp()
      });
      alert("Mission accepted! Report status updated to IN-PROGRESS.");
    } catch (e) {
      alert("Error accepting dispatch.");
    }
  };

  const completeTask = async (taskId) => {
    try {
      await updateDoc(doc(db, 'problems', taskId), {
        status: 'done',
        completedAt: serverTimestamp()
      });

      // Update volunteer stats
      const volRef = doc(db, 'volunteers', profile.id);
      await updateDoc(volRef, {
        tasksCompleted: (profile.tasksCompleted || 0) + 1
      });

      alert("Mission status: COMPLETED.");
    } catch (e) {
      alert("Error finalizing mission.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const q = query(collection(db, 'volunteers'), where('name', '==', loginData.name), where('phone', '==', loginData.phone), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("No volunteer found with these credentials.");
      } else {
        localStorage.setItem('volunteerId', snap.docs[0].id);
        window.location.reload();
      }
    } catch (e) {
      alert("Login error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.skills.length === 0) { alert("Select at least one skill."); return; }
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'volunteers'), {
        ...formData,
        status: 'available',
        tasksCompleted: 0,
        joinedAt: serverTimestamp()
      });
      localStorage.setItem('volunteerId', docRef.id);
      window.location.reload();
    } catch (e) {
      alert("Registration Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '4rem' }}><Activity className="animate-pulse" /> Loading Protocol...</div>;

  if (profile && view === 'profile') {
    return (
      <div className="responsive-container animate-fade">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '3rem' }}>

          {/* Profile & Stats Sidebar */}
          <aside>
            <div className="glass-card" style={{ position: 'sticky', top: '7rem', textAlign: 'center' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                <CircleUser size={60} style={{ color: 'var(--primary)' }} />
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>{profile.name}</h2>
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green)', padding: '0.4rem 1rem', borderRadius: '2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '900', marginBottom: '1.5rem' }}>
                <ShieldCheck size={14} /> ACTIVE RESPONDER
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{activeTasks.length}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>ACTIVE</p>
                </div>
                <div style={{ background: 'var(--bg-card-solid)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--accent-green)' }}>{historyTasks.length}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>DONE</p>
                </div>
              </div>

              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.9rem' }}>
                  <MapPin size={16} style={{ color: 'var(--primary)' }} /> {profile.area}
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.9rem' }}>
                  <Wrench size={16} style={{ color: 'var(--primary)' }} /> {profile.skills.join(', ')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button onClick={() => { localStorage.removeItem('volunteerId'); window.location.reload(); }} className="btn-primary" style={{ background: 'var(--bg-card-solid)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', fontSize: '0.75rem' }}><LogOut size={14} /> Exit</button>
                <button onClick={() => { if (window.confirm("Delete profile?")) { deleteDoc(doc(db, 'volunteers', profile.id)); localStorage.removeItem('volunteerId'); window.location.reload(); } }} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: 'none', fontSize: '0.75rem' }}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </aside>

          {/* Task Operations Hub */}
          <main style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* 1. Notifications (Pending Reports) */}
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                <Bell size={20} className={notifications.length > 0 ? 'animate-pulse' : ''} />
                Dispatch Notifications ({notifications.length})
              </h3>
              {notifications.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  Awaiting reports that match your skills...
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {notifications.map(notif => (
                    <div key={notif.id} className="glass-card animate-fade" style={{ borderLeft: '5px solid var(--primary)', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{notif.location}</h4>
                          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' }}>Expertise Needed: {notif.requiredSkill}</p>
                        </div>
                        <span className={`priority-badge priority-${notif.priority}`}>{notif.priority}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>{notif.description}</p>
                      <button onClick={() => acceptDispatch(notif.id)} className="btn-primary" style={{ width: 'auto', padding: '0.7rem 1.5rem' }}>
                        Accept Dispatch & Deploy <ArrowRight size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Active Tasks (In Progress) */}
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', color: 'var(--accent-orange)' }}>
                <Activity size={20} />
                Active Missions ({activeTasks.length})
              </h3>
              {activeTasks.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                  No active deployments.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  {activeTasks.map(task => (
                    <div key={task.id} className="glass-card animate-fade" style={{ borderLeft: '5px solid var(--accent-orange)', padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{task.location}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-orange)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          <Clock size={14} className="animate-pulse" /> IN PROGRESS
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>{task.description}</p>
                      <button onClick={() => completeTask(task.id)} className="btn-primary" style={{ width: 'auto', background: 'var(--accent-green)', padding: '0.7rem 1.5rem' }}>
                        <CheckCircle size={18} /> Mark as Completed
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. Mission History (Completed) */}
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', color: 'var(--accent-green)' }}>
                <History size={20} />
                Mission History ({historyTasks.length})
              </h3>
              {historyTasks.length > 0 ? (
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                  {historyTasks.map(task => (
                    <div key={task.id} style={{ padding: '1.2rem 2rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem' }}>{task.location}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>{task.type} Incident • {task.completedAt?.toDate().toLocaleDateString()}</p>
                      </div>
                      <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        <CheckCircle size={16} /> RESOLVED
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>No history recorded.</p>
              )}
            </section>

          </main>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <AuthWrapper title="Responder Portal" desc="Log in to view dispatch notifications and manage missions." icon={LogIn} footer={
        <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
          Not a member? <button onClick={() => setView('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Register Now</button>
        </p>
      }>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group" style={{ margin: 0 }}><label>Full Name</label><input required type="text" value={loginData.name} onChange={e => setLoginData({ ...loginData, name: e.target.value })} placeholder="E.g. Rahul Sharma" /></div>
          <div className="form-group" style={{ margin: 0 }}><label>Phone Number</label><input required type="tel" value={loginData.phone} onChange={e => setLoginData({ ...loginData, phone: e.target.value })} placeholder="+91..." /></div>
          <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Verifying...' : 'Access Dispatch Dashboard'}</button>
        </form>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper title="New Responder" desc="Register your skills to join the real-time crisis response network." icon={UserPlus} footer={
      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
        Already registered? <button onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Log In</button>
      </p>
    }>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div className="form-group" style={{ margin: 0 }}><label>Full Name</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
        <div className="form-group" style={{ margin: 0 }}><label>Phone Number</label><input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
        <div className="form-group" style={{ margin: 0 }}><label>Primary Neighborhood</label><input required type="text" value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} /></div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Expertise Area</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {skillOptions.map(skill => (
              <div key={skill} onClick={() => setFormData(prev => ({ ...prev, skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill] }))} style={{ padding: '0.6rem 0.4rem', background: formData.skills.includes(skill) ? 'var(--primary)' : 'rgba(255,255,255,0.03)', borderRadius: '0.8rem', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center', border: '1px solid', borderColor: formData.skills.includes(skill) ? 'var(--primary)' : 'var(--glass-border)', color: formData.skills.includes(skill) ? 'white' : 'var(--text-dim)', fontWeight: 'bold' }}>{skill}</div>
            ))}
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ marginTop: '1rem' }}>{isSubmitting ? 'Registering...' : 'Complete Profile'}</button>
      </form>
    </AuthWrapper>
  );
};

export default Volunteer;
