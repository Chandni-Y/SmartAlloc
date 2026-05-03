import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Paperclip, X, MapPin, AlertCircle, ShieldAlert, CheckCircle, Info, Navigation, ArrowRight, Activity, Zap, Droplets, Flame, Heart, Wrench, Trash2, Shield, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const Home = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ reporterName: '', location: '', description: '', type: '' });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [gpsLocation, setGpsLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const navigate = useNavigate();

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFormData({ ...formData, location: '📍 GPS Location Locked' });
      }, (err) => {
        alert("GPS Error: " + err.message);
      }, { timeout: 10000 });
    }
  };

  const incidentTypes = [
    { id: 'Medical', label: 'Medical', icon: Heart, color: '#ef4444' },
    { id: 'Electricity', label: 'Electricity', icon: Zap, color: '#facc15' },
    { id: 'Water', label: 'Water Leak', icon: Droplets, color: '#3b82f6' },
    { id: 'Road', label: 'Road/Accident', icon: MapPin, color: '#f97316' },
    { id: 'Sewage', label: 'Sewage/Drain', icon: Wrench, color: '#8b5cf6' },
    { id: 'Cleaning', label: 'Garbage/Waste', icon: Trash2, color: '#10b981' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze this crisis report: "${formData.description}". Context: Type ${formData.type}. You must respond ONLY with a valid JSON object matching this exact format: {"type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}. Do not include markdown formatting or extra text.`;
      
      let aiData;
      try {
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        aiData = JSON.parse(response.text().match(/\{[\s\S]*\}/)[0]);
      } catch (e) {
        aiData = { type: formData.type || "Other", severity: 5, peopleAffected: 1 };
      }

      let attachmentUrl = null;
      if (file) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        attachmentUrl = await base64Promise;
      }

      let lat = gpsLocation ? gpsLocation.lat : 0;
      let lng = gpsLocation ? gpsLocation.lng : 0;
      if (!gpsLocation) {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
        const geoData = await geoRes.json();
        if (geoData.results?.length > 0) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      }

      const generatedId = "SA-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Map Incident Type to Required Skill
      const skillMap = { 
        "Medical": "Medical", 
        "Electricity": "Electrician", 
        "Water": "Plumbing", 
        "Road": "Construction", 
        "Sewage": "Cleaning", 
        "Cleaning": "Cleaning" 
      };
      const requiredSkill = skillMap[formData.type] || "General";

      await addDoc(collection(db, 'problems'), {
        ...formData,
        reporterName: isAnonymous ? "Anonymous" : formData.reporterName,
        ...aiData,
        status: 'pending',
        trackingId: generatedId,
        requiredSkill,
        lat, lng,
        attachmentUrl,
        isEmergencyOverride: isEmergency,
        timestamp: serverTimestamp()
      });

      setTrackingId(generatedId);
      setSuccess(true);
    } catch (error) {
      alert("Submission Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card animate-fade" style={{ textAlign: 'center', padding: '5rem 2rem', maxWidth: '600px', margin: '4rem auto' }}>
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', margin: '0 auto 2.5rem' }}>
          <CheckCircle size={60} />
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Dispatch Successful</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '3rem' }}>Incident log finalized. Tracking ID generated for real-time monitoring.</p>
        <div style={{ background: 'var(--bg-card-solid)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)', marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Incident Tracking ID</p>
          <strong style={{ fontSize: '2.5rem', letterSpacing: '5px', color: 'var(--primary)' }}>{trackingId}</strong>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ width: '100%', padding: '1.2rem' }}>Track on Live Map <ArrowRight size={20}/></button>
      </div>
    );
  }

  return (
    <div className="responsive-container animate-fade" style={{ maxWidth: '900px' }}>
      
      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: step >= i ? 'var(--primary)' : 'var(--glass-border)', transition: 'var(--transition)' }} />
        ))}
      </div>

      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
          {step === 1 ? "What's the emergency?" : step === 2 ? "Provide Details" : "Final Review"}
        </h1>
        <p style={{ color: 'var(--text-dim)' }}>Step {step} of 3: AI-Assisted Incident Reporting</p>
      </header>

      <div className="glass-card" style={{ padding: '3rem' }}>
        
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem' }}>
            {incidentTypes.map(type => (
              <div 
                key={type.id}
                onClick={() => { setFormData({...formData, type: type.id}); setStep(2); }}
                style={{ 
                  padding: '2rem 1.5rem', borderRadius: '1.5rem', border: '2px solid', 
                  borderColor: formData.type === type.id ? 'var(--primary)' : 'var(--glass-border)',
                  background: formData.type === type.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  textAlign: 'center', cursor: 'pointer', transition: 'var(--transition)'
                }}
              >
                <div style={{ color: type.color, marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                  <type.icon size={40} />
                </div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{type.label}</p>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade">
            <div className="form-group">
              <label>Describe what happened</label>
              <textarea 
                rows="5" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Provide a clear description for the response team..."
                autoFocus
              />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0 }}>Incident Location</label>
                <button type="button" onClick={handleGPS} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Navigation size={14} /> Detect GPS
                </button>
              </div>
              <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Area name or specific address" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
              <button onClick={() => setStep(1)} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-dim)', flex: 1 }}>
                <ChevronLeft size={20}/> Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary" style={{ flex: 2 }} disabled={!formData.description || !formData.location}>
                Continue <ChevronRight size={20}/>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Reporter Identity</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setIsAnonymous(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.8rem', border: '1px solid', borderColor: !isAnonymous ? 'var(--primary)' : 'var(--glass-border)', background: !isAnonymous ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: !isAnonymous ? 'var(--primary)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>Public</button>
                  <button onClick={() => setIsAnonymous(true)} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.8rem', border: '1px solid', borderColor: isAnonymous ? 'var(--primary)' : 'var(--glass-border)', background: isAnonymous ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: isAnonymous ? 'var(--primary)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold' }}>Anonymous</button>
                </div>
              </div>
              {!isAnonymous && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Full Name</label>
                  <input type="text" value={formData.reporterName} onChange={e => setFormData({...formData, reporterName: e.target.value})} placeholder="John Doe" />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Visual Evidence (Optional)</label>
              <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
                {!file ? (
                  <>
                    <input type="file" accept="image/*" onChange={e => {
                      const f = e.target.files[0];
                      if(f) { setFile(f); setFilePreview(URL.createObjectURL(f)); }
                    }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <Paperclip size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-dim)' }}>Upload photo/video proof</p>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'left' }}>
                    <img src={filePreview} alt="Preview" style={{ width: '80px', height: '80px', borderRadius: '1rem', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{file.name}</p>
                      <button onClick={() => {setFile(null); setFilePreview(null);}} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.8rem', padding: 0, marginTop: '0.4rem' }}>Remove file</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: isEmergency ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card-solid)', border: '1px solid', borderColor: isEmergency ? 'var(--accent-red)' : 'var(--glass-border)', padding: '1.5rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem', transition: 'var(--transition)' }}>
              <div onClick={() => setIsEmergency(!isEmergency)} style={{ width: '50px', height: '26px', background: isEmergency ? 'var(--accent-red)' : 'var(--glass-border)', borderRadius: '13px', position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '3px', left: isEmergency ? '27px' : '3px', transition: 'var(--transition)' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', color: isEmergency ? 'var(--accent-red)' : 'var(--text-primary)' }}>IMMEDIATE THREAT TO LIFE</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>AI will escalate this to high-priority dispatch.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
              <button onClick={() => setStep(2)} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-dim)', flex: 1 }}>
                <ChevronLeft size={20}/> Back
              </button>
              <button onClick={handleSubmit} className="btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? <Activity className="animate-pulse" /> : <><Shield size={20}/> Finalize & Submit</>}
              </button>
            </div>
          </div>
        )}

      </div>
      
      <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-dim)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={16} style={{ color: 'var(--primary)' }} /> Data handled by SmartAlloc Crisis Protocol v2.0
      </div>
    </div>
  );
};

export default Home;
