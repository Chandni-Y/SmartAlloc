import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Phone, MapPin, Wrench, CircleUser, Activity, Star, CheckCircle, Search, Filter, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { getDistanceKm } from '../utils/geo';

const VolunteerList = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [sortBy, setSortBy] = useState('recent'); 
  const [filterSkill, setFilterSkill] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchArea, setSearchArea] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locatingError, setLocatingError] = useState('');

  const skillOptions = [
    "Construction", "Plumbing", "Cleaning", "Medical", "Electrician", "General",
    "Search & Rescue", "Firefighting", "First Aid", "Driving", "Counseling", "Communication"
  ];

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const q = query(collection(db, 'volunteers'), orderBy('joinedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const vols = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVolunteers(vols);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, []);

  const handleSortChange = async (newSort) => {
    if (newSort === 'nearest') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSortBy('nearest');
          setLocatingError('');
        }, () => {
          setLocatingError("Location access denied. Cannot sort by distance.");
        });
      }
    } else {
      setSortBy(newSort);
    }
  };

  const filteredAndSortedVols = volunteers
    .filter(v => filterSkill === 'All' || (v.skills || [v.skill]).includes(filterSkill))
    .filter(v => filterStatus === 'All' || v.status === filterStatus)
    .filter(v => searchArea === '' || (v.area && v.area.toLowerCase().includes(searchArea.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === 'tasksCompleted') return (b.tasksCompleted || 0) - (a.tasksCompleted || 0);
      if (sortBy === 'highestRated') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'nearest' && userLocation) {
        if (!a.lat || !a.lng) return 1;
        if (!b.lat || !b.lng) return -1;
        return getDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng) - getDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
      }
      return 0;
    });

  if (loading) return <div style={{ textAlign: 'center', marginTop: '4rem' }}><Activity className="animate-pulse" /> Loading Global Responder Registry...</div>;

  return (
    <div className="responsive-container animate-fade" style={{ maxWidth: '1200px' }}>
      <header style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: '800', fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 1.2rem', borderRadius: '2rem', marginBottom: '1.5rem', letterSpacing: '1px' }}>
          <ShieldCheck size={16} /> VERIFIED RESPONDER NETWORK
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Responder Directory</h1>
        <p style={{ color: 'var(--text-dim)', maxWidth: '600px', margin: '0 auto' }}>A searchable database of community volunteers equipped for crisis response and emergency resource allocation.</p>
      </header>

      {/* Advanced Filter Bar */}
      <div className="glass-card" style={{ marginBottom: '3rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', top: '50%', left: '1.2rem', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input 
              type="text" 
              placeholder="Search by neighborhood or area..." 
              value={searchArea} 
              onChange={(e) => setSearchArea(e.target.value)} 
              style={{ paddingLeft: '3rem', background: 'rgba(255,255,255,0.03)' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={filterSkill} onChange={e => setFilterSkill(e.target.value)} style={{ flex: 1, background: 'rgba(255,255,255,0.03)' }}>
              <option value="All">All Expertise</option>
              {skillOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ flex: 1, background: 'rgba(255,255,255,0.03)' }}>
              <option value="All">All Statuses</option>
              <option value="available">Ready (Available)</option>
              <option value="busy">Busy (On Mission)</option>
            </select>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <TrendingUp size={16} /> SORT BY:
             </span>
             <div style={{ display: 'flex', gap: '0.5rem' }}>
               {['recent', 'tasksCompleted', 'highestRated', 'nearest'].map(mode => (
                 <button 
                  key={mode} 
                  onClick={() => handleSortChange(mode)}
                  style={{ 
                    padding: '0.4rem 0.8rem', borderRadius: '0.6rem', border: '1px solid', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: 'var(--transition)',
                    background: sortBy === mode ? 'var(--primary)' : 'transparent',
                    borderColor: sortBy === mode ? 'var(--primary)' : 'var(--glass-border)',
                    color: sortBy === mode ? 'white' : 'var(--text-dim)'
                  }}
                 >
                   {mode === 'recent' ? 'Latest' : mode === 'tasksCompleted' ? 'Missions' : mode === 'highestRated' ? 'Ratings' : 'Distance'}
                 </button>
               ))}
             </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>
            <Users size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} /> {filteredAndSortedVols.length} Responders Found
          </div>
        </div>
      </div>
      
      {locatingError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '1rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'center', fontWeight: 'bold' }}>{locatingError}</div>}

      {filteredAndSortedVols.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>No responders match your current criteria. Try widening your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
          {filteredAndSortedVols.map(vol => (
            <div key={vol.id} className="glass-card animate-fade" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', position: 'relative', overflow: 'hidden' }}>
              
              {/* Status Ribbon */}
              <div style={{ 
                position: 'absolute', top: '1rem', right: '-2.5rem', background: vol.status === 'available' ? 'var(--accent-green)' : 'var(--accent-red)', color: 'white', padding: '0.3rem 3rem', transform: 'rotate(45deg)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 5px 10px rgba(0,0,0,0.2)'
              }}>
                {vol.status === 'available' ? 'READY' : 'BUSY'}
              </div>

              <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '1.2rem', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)' }}>
                  <CircleUser size={40} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{vol.name}</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#facc15', fontWeight: '900', fontSize: '0.85rem' }}>
                      <Star size={16} fill="currentColor"/> {(vol.averageRating || 0).toFixed(1)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--accent-green)', fontWeight: '900', fontSize: '0.85rem' }}>
                      <CheckCircle size={16} /> {vol.tasksCompleted || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <Wrench size={18} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '800', textTransform: 'uppercase' }}>Expertise</p>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>{(vol.skills || [vol.skill]).join(', ')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <MapPin size={18} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: '800', textTransform: 'uppercase' }}>Operational Area</p>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>{vol.area}</p>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.2rem', marginTop: 'auto' }}>
                <a href={`tel:${vol.phone}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: '800', fontSize: '0.9rem', padding: '0.8rem', borderRadius: '0.8rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', transition: 'var(--transition)' }}>
                  <Phone size={18} /> Call Responder
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerList;
