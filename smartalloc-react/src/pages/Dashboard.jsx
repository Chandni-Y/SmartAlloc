import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { MapPin, CheckCircle, User, Loader2, AlertTriangle, Zap, Activity, Users, Clock, ShieldAlert, Heart, Wrench, Trash2, Droplets } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, done: 0 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMap = useRef(null);
  const markers = useRef({});
  const [loggedInVolunteer, setLoggedInVolunteer] = useState(null);

  useEffect(() => {
    const checkVolunteer = async () => {
      const savedId = localStorage.getItem('volunteerId');
      if (savedId) {
        try {
          const docSnap = await getDoc(doc(db, 'volunteers', savedId));
          if (docSnap.exists()) {
            setLoggedInVolunteer({ id: docSnap.id, ...docSnap.data() });
          }
        } catch (err) {
          console.error("Error fetching volunteer:", err);
        }
      }
    };
    checkVolunteer();

    // Google Maps is now loaded in index.html
    const checkMap = setInterval(() => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        clearInterval(checkMap);
      }
    }, 500);

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

    return () => {
      unsubscribe();
      if (checkMap) clearInterval(checkMap);
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && mapRef.current && !googleMap.current) {
      googleMap.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 22.7196, lng: 75.8577 },
        zoom: 12,
        mapId: '4504f8b37365c3d0', // Using a generic Map ID for Advanced Markers
        disableDefaultUI: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ]
      });
    }
  }, [mapLoaded]);

  useEffect(() => {
    const updateMarkers = async () => {
      if (googleMap.current && window.google) {
        // Clear old markers
        Object.values(markers.current).forEach(m => m.setMap(null));
        markers.current = {};

        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary("marker");

        problems.forEach((p) => {
          if (p.lat && p.lng) {
            const pinBackground = p.status === 'done' ? '#22c55e' : p.status === 'assigned' ? '#6366f1' : '#ef4444';
            const pin = new PinElement({
              background: pinBackground,
              borderColor: '#ffffff',
              glyphColor: '#ffffff',
              scale: 0.8
            });

            const marker = new AdvancedMarkerElement({
              position: { lat: p.lat, lng: p.lng },
              map: googleMap.current,
              title: p.location,
              content: pin.element
            });

            marker.addListener('click', () => {
              navigate(`/problem/${p.id}`);
            });

            markers.current[p.id] = marker;
          }
        });
      }
    };
    updateMarkers();
  }, [problems, mapLoaded, navigate]);

  const skillMap = { "Road": "Construction", "Water": "Plumbing", "Sewage": "Cleaning", "Medical": "Medical", "Electricity": "Electrician", "Cleaning": "Cleaning" };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Medical': return <Heart size={18} />;
      case 'Electricity': return <Zap size={18} />;
      case 'Water': return <Droplets size={18} />;
      case 'Road': return <Activity size={18} />;
      case 'Sewage': return <Trash2 size={18} />;
      default: return <AlertTriangle size={18} />;
    }
  };

  return (
    <div className="dashboard-layout animate-fade">
      <div className="main-feed">
        <div className="stat-grid">
          <div className="glass-card stat-card" style={{ borderBottom: '4px solid var(--primary)' }}>
            <Users style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Reports</span>
          </div>
          <div className="glass-card stat-card" style={{ borderBottom: '4px solid var(--accent-orange)' }}>
            <ShieldAlert style={{ color: 'var(--accent-orange)', marginBottom: '0.5rem' }} />
            <span className="stat-value" style={{ color: 'var(--accent-orange)' }}>{stats.pending}</span>
            <span className="stat-label">Broadcast Pending</span>
          </div>
          <div className="glass-card stat-card" style={{ borderBottom: '4px solid var(--primary)' }}>
            <Activity style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
            <span className="stat-value">{stats.assigned}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="glass-card stat-card" style={{ borderBottom: '4px solid var(--accent-green)' }}>
            <CheckCircle style={{ color: 'var(--accent-green)', marginBottom: '0.5rem' }} />
            <span className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats.done}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>

        <div className="feed-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity className="animate-pulse" style={{ color: 'var(--accent-red)' }} />
            Real-time Incident Feed
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '1rem' }}>
            Updating Live
          </div>
        </div>

        <div id="problemFeed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {problems.map(p => {
            const requiredSkill = skillMap[p.type] || 'General';
            // Multi-skill match logic fix
            const isSkillMatch = loggedInVolunteer && (loggedInVolunteer.skills || [loggedInVolunteer.skill]).includes(requiredSkill);

            return (
              <div key={p.id}
                className="glass-card problem-card"
                onClick={() => navigate(`/problem/${p.id}`)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}
              >
                <div style={{
                  width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSkillMatch ? 'var(--accent-green)' : 'var(--text-dim)',
                  flexShrink: 0
                }}>
                  {getTypeIcon(p.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{p.location}</h3>
                    <span className={`priority-badge priority-${p.priority}`}>{p.priority}</span>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.8rem', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} />
                      {p.timestamp ? new Date(p.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: isSkillMatch ? 'var(--accent-green)' : 'var(--text-dim)' }}>
                      <Wrench size={14} />
                      {requiredSkill} Support {isSkillMatch && ' (Skill Match!)'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div className={`status-indicator status-${p.status}`} style={{ display: 'inline-block', marginRight: '5px' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: `var(--status-${p.status})` }}>
                    {p.status}
                  </span>
                  {p.suggestedVolunteer && p.status === 'pending' && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: 'bold' }} className="animate-pulse">
                      DISPATCHING...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="map-sidebar">
        <div className="glass-card" style={{ height: 'calc(100vh - 12rem)', padding: '0.5rem', position: 'sticky', top: '7rem' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '1rem', overflow: 'hidden' }}>
            {!mapLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Loader2 className="animate-pulse" /></div>}
          </div>
          <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '1rem', fontSize: '0.8rem', border: '1px solid var(--glass-border)', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
            📡 Live GPS Tracking Active
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
