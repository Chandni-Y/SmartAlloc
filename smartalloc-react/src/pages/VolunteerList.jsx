import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Phone, MapPin, Wrench, CircleUser, Activity } from 'lucide-react';

const VolunteerList = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const q = query(collection(db, 'volunteers'), orderBy('joinedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const vols = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVolunteers(vols);
      } catch (err) {
        console.error("Error fetching volunteers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVolunteers();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading volunteer database...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Volunteer Directory</h1>
        <p style={{ color: 'var(--text-dim)' }}>Registered responders available for deployment.</p>
      </header>

      {volunteers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p>No volunteers have registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {volunteers.map(vol => (
            <div key={vol.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <CircleUser size={40} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{vol.name}</h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '1rem', 
                    background: vol.status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: vol.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginTop: '0.3rem'
                  }}>
                    <Activity size={10} />
                    {vol.status === 'available' ? 'Available' : 'Busy'}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                <MapPin size={16} />
                <span>{vol.area}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                <Phone size={16} />
                <span>{vol.phone}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <Wrench size={16} style={{ color: 'var(--accent-yellow)' }} />
                <span style={{ fontWeight: '500', color: 'var(--text)' }}>Skill: {vol.skill}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerList;
