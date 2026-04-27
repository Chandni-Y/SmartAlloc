import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CircleUser, Activity, Trash2, LogOut } from 'lucide-react';

const Volunteer = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', area: '', skill: '' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const savedId = localStorage.getItem('volunteerId');
      if (savedId) {
        try {
          const docRef = doc(db, 'volunteers', savedId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
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
  }, []);

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
      setProfile({ id: docRef.id, ...formData, status: 'available' });
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
    if (!window.confirm("Are you sure you want to delete your profile? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'volunteers', profile.id));
      localStorage.removeItem('volunteerId');
      setProfile(null);
      setFormData({ name: '', phone: '', area: '', skill: '' });
    } catch (e) {
      alert("Error deleting profile.");
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading...</div>;
  }

  if (profile) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>My Volunteer Profile</h1>
          <p style={{ color: 'var(--text-dim)' }}>Manage your availability.</p>
        </header>
        <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <CircleUser size={64} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>{profile.name}</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>{profile.skill} • {profile.area}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <button onClick={toggleStatus} style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              background: profile.status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: profile.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)'
            }}>
              <Activity size={20} />
              {profile.status === 'available' ? 'Currently Available (Click to set Busy)' : 'Currently Busy (Click to set Available)'}
            </button>
            
            <button onClick={() => { localStorage.removeItem('volunteerId'); setProfile(null); }} style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              border: '1px solid var(--primary)', 
              background: 'transparent',
              color: 'var(--primary)',
              cursor: 'pointer', 
              fontWeight: 'bold',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem'
            }}>
              <LogOut size={20} />
              Register Someone Else
            </button>

            <button onClick={deleteProfile} style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              border: '1px solid rgba(239, 68, 68, 0.5)', 
              background: 'transparent',
              color: 'var(--accent-red)',
              cursor: 'pointer', 
              fontWeight: 'bold',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem'
            }}>
              <Trash2 size={20} />
              Delete My Profile
            </button>
          </div>
          
          <p style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
            <a href="/volunteer-list" style={{ color: 'var(--primary)', textDecoration: 'none' }}>View All Registered Volunteers →</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
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
          <a href="/volunteer-list" style={{ color: 'var(--primary)', textDecoration: 'none' }}>View All Registered Volunteers →</a>
        </p>
      </div>
    </div>
  );
};

export default Volunteer;
