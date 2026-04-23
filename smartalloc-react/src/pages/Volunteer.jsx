import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Volunteer = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', area: '', skill: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'volunteers'), {
        ...formData,
        status: 'available',
        joinedAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card animate-fade" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-green)', marginBottom: '1rem' }}>Welcome to the Team!</h2>
        <p style={{ color: 'var(--text-dim)' }}>You've been added to our response network. We'll match you with crises in your area.</p>
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
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registering...' : 'Join Response Team'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Volunteer;
