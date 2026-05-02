import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { MapPin, CheckCircle, User, Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, done: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMap = useRef(null);
  const markers = useRef({});
  const [loggedInVolunteer, setLoggedInVolunteer] = useState(null);

  useEffect(() => {
    // Check if a volunteer is logged in
    const checkVolunteer = async () => {
      const savedId = localStorage.getItem('volunteerId');
      if (savedId) {
        try {
          const docSnap = await getDoc(doc(db, 'volunteers', savedId));
          if (docSnap.exists()) {
            setLoggedInVolunteer({ id: docSnap.id, ...docSnap.data() });
          }
        } catch (err) {
          console.error("Error fetching logged in volunteer:", err);
        }
      }
    };
    checkVolunteer();

    // 1. Load Google Maps
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=marker`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setMapLoaded(true);
    }

    // 2. Real-time Listener
    const q = query(collection(db, 'problems'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setProblems(data);
      
      const newStats = { total: data.length, pending: 0, assigned: 0, done: 0 };
      data.forEach(p => {
        if (p.status === 'pending') newStats.pending++;
        if (p.status === 'assigned') newStats.assigned++;
        if (p.status === 'done') newStats.done++;
      });
      setStats(newStats);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current && !googleMap.current) {
      googleMap.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 22.7196, lng: 75.8577 }, // Indore, India
        zoom: 12,
        styles: [{ elementType: "geometry", stylers: [{ color: "#242f3e" }] }] // Basic dark style
      });
    }
  }, [mapLoaded]);

  useEffect(() => {
    if (googleMap.current && window.google) {
      // Clear old markers
      Object.values(markers.current).forEach(m => m.setMap(null));
      markers.current = {};

      problems.forEach(async (p) => {
        if (p.lat && p.lng) {
          const marker = new window.google.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map: googleMap.current,
            title: p.location,
            // Using standard Google red marker for maximum reliability
            icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          });
          markers.current[p.id] = marker;
        }
      });
    }
  }, [problems, mapLoaded]);

  const updateStatus = async (id, status) => {
    const updateData = { status };
    if (status === 'assigned' && loggedInVolunteer) {
      updateData.assignedVolunteerId = loggedInVolunteer.id;
      updateData.assignedVolunteerName = loggedInVolunteer.name;
    }
    await updateDoc(doc(db, 'problems', id), updateData);
  };

  const skillMap = { "Road": "Construction", "Water": "Plumbing", "Sewage": "Cleaning", "Medical": "Medical", "Electricity": "Electrician" };

  return (
    <div className="dashboard-layout">
      <div>
        <div className="stat-grid">
          <div className="glass-card stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Reports</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-value" style={{ color: 'var(--accent-orange)' }}>{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-value" style={{ color: 'var(--primary)' }}>{stats.assigned}</span>
            <span className="stat-label">Assigned</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.done}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>

        <div id="problemFeed">
          {problems.map(p => {
            const isSkillMatch = loggedInVolunteer && skillMap[p.type] === loggedInVolunteer.skill;
            const isAssignedToMe = loggedInVolunteer && p.assignedVolunteerId === loggedInVolunteer.id;

            return (
              <div key={p.id} className="glass-card problem-card">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className={`status-indicator status-${p.status}`}></span>
                    <h3 style={{ fontSize: '1rem' }}>{p.location}</h3>
                    <span className={`priority-badge priority-${p.priority}`}>{p.priority}</span>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{p.description}</p>
                  <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {p.weatherCondition && <span>Weather: {p.weatherCondition} {p.weatherBonusApplied && '⚡'} • </span>}
                    {p.status === 'pending' ? (
                      <span style={{ color: isSkillMatch ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                        Needs: {skillMap[p.type] || 'General'} Support {isSkillMatch ? ' (Match!)' : !loggedInVolunteer ? ' (Login to Accept)' : ''}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--primary)' }}>Assigned to: {p.assignedVolunteerName}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {p.status === 'pending' && (
                    <div style={{ 
                      textAlign: 'right',
                      padding: '0.4rem 0.8rem', 
                      fontSize: '0.8rem',
                      color: p.suggestedVolunteer ? 'var(--primary)' : 'var(--text-dim)',
                      fontWeight: 'bold'
                    }}>
                      {p.suggestedVolunteer ? (
                        <span className="animate-pulse">🚀 Dispatching: {p.suggestedVolunteer}...</span>
                      ) : (
                        'Searching for Responder...'
                      )}
                    </div>
                  )}
                  
                  {p.status === 'assigned' && (
                    <div style={{ 
                      textAlign: 'right',
                      padding: '0.4rem 0.8rem', 
                      fontSize: '0.8rem', 
                      color: 'var(--accent-green)',
                      fontWeight: 'bold'
                    }}>
                      ✅ In Progress ({p.assignedVolunteerName})
                    </div>
                  )}

                  {p.status === 'done' && (
                    <div style={{ 
                      textAlign: 'right',
                      padding: '0.4rem 0.8rem', 
                      fontSize: '0.8rem', 
                      color: 'var(--text-dim)',
                      fontWeight: 'bold'
                    }}>
                      🏆 Mission Completed
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="map-container-outer">
        <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '1.5rem', background: '#1e293b' }}>
          {!mapLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Loader2 className="animate-pulse" /></div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
