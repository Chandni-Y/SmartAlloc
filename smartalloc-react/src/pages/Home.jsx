import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Paperclip, X } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";



const Home = () => {
  const [formData, setFormData] = useState({ reporterName: '', location: '', description: '' });
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
        setFormData({ ...formData, location: '📍 Precise GPS Coordinates Loaded' });
      }, (err) => {
        console.warn("GPS Error:", err);
        if (err.code === 1) {
          alert("GPS access denied. Please allow location permissions in your browser.");
        } else if (err.code === 2) {
          alert("Your device cannot determine its location (common on desktop computers without Wi-Fi). Please type your location manually.");
        } else {
          alert("GPS error: " + err.message);
        }
      }, { timeout: 10000 });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  // Helper to convert file to generative part
  async function fileToGenerativePart(file) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { reporterName, location, description } = formData;
    const finalReporterName = isAnonymous ? "Anonymous" : reporterName;

    try {
      // 1. AI Analysis (Groq Llama 3 - Faster & Reliable)
      const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
      const prompt = `Analyze this crisis report: "${description}". You must respond ONLY with a valid JSON object matching this exact format: {"type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}. Do not include markdown formatting or extra text.`;

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!groqRes.ok) {
        const errorBody = await groqRes.json().catch(() => ({}));
        throw new Error(`Groq AI Error: ${groqRes.status} ${errorBody.error?.message || groqRes.statusText}`);
      }

      const groqData = await groqRes.json();
      
      let aiData;
      try {
        aiData = JSON.parse(groqData.choices[0].message.content);
      } catch (parseError) {
        console.error("Raw Output:", groqData.choices[0].message.content);
        throw new Error("Groq AI failed to return valid JSON. Please try again.");
      }


      // 1.5 Bypass Firebase Storage to avoid CORS/Permission errors on cloned repos
      // We convert the file to a Base64 string and save it directly in Firestore
      let attachmentUrl = null;
      let attachmentType = null;
      if (file) {
        if (file.size > 800000) { // Firestore has a 1MB limit per document
          throw new Error("File is too large (max 800KB). Because you don't own the Firebase project, large video/image uploads are restricted.");
        }
        
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        attachmentUrl = await base64Promise;
        attachmentType = file.type;
      }

      // 2. Geocoding & Weather
      let lat = gpsLocation ? gpsLocation.lat : 0;
      let lng = gpsLocation ? gpsLocation.lng : 0;
      let weather = "Clear";

      if (!gpsLocation) {
        const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
        const geoData = await geoRes.json();
        if (geoData.results?.length > 0) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      }

      if (lat && lng) {
        try {
          const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`);
          const wData = await wRes.json();
          weather = wData.weather?.[0]?.main || "Clear";
        } catch (e) {}
      }

      // 3. Logic
      let score = (aiData.severity * 2) + (aiData.peopleAffected * 1);
      const badWeather = ["Rain", "Thunderstorm", "Drizzle", "Snow"];
      const isSensitive = ["Water", "Sewage", "Road"].includes(aiData.type);
      const weatherBonus = (badWeather.includes(weather) && isSensitive) ? 5 : 0;
      score += weatherBonus;

      let priority = score > 15 ? "High" : score > 8 ? "Medium" : "Low";

      // EMERGENCY OVERRIDE
      if (isEmergency) {
        priority = "High";
        score = 99;
        aiData.severity = 10;
      }

      // 4. Match Volunteer
      const skillMap = { "Road": "Construction", "Water": "Plumbing", "Sewage": "Cleaning", "Medical": "Medical", "Electricity": "Electrician" };
      const q = query(collection(db, "volunteers"), where("skill", "==", skillMap[aiData.type] || "General"), where("status", "==", "available"), limit(1));
      const vSnap = await getDocs(q);
      const suggestedVolunteer = vSnap.empty ? null : vSnap.docs[0].data().name;

      const generatedId = "SA-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 5. Save
      await addDoc(collection(db, 'problems'), {
        ...formData,
        reporterName: finalReporterName,
        ...aiData,
        priority,
        priorityScore: score,
        weatherCondition: weather,
        weatherBonusApplied: weatherBonus > 0,
        isEmergencyOverride: isEmergency,
        suggestedVolunteer,
        trackingId: generatedId,
        status: 'pending',
        lat, lng,
        attachmentUrl,
        attachmentType,
        timestamp: serverTimestamp()
      });

      setTrackingId(generatedId);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Submission Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-card animate-fade" style={{ textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-green)', marginBottom: '1rem' }}>Report Submitted!</h2>
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'inline-block' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '0.3rem' }}>Your Tracking ID:</p>
            <strong style={{ fontSize: '1.5rem', letterSpacing: '2px' }}>{trackingId}</strong>
        </div>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>Our AI has prioritized your report and mapped it for responders.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">View on Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Report a Problem</h1>
        <p style={{ color: 'var(--text-dim)' }}>AI-driven crisis response and resource allocation.</p>
      </header>
      <div className="glass-card">
        <form onSubmit={handleSubmit}>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input type="checkbox" id="anon" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="anon" style={{ margin: 0, cursor: 'pointer' }}>Submit Anonymously</label>
          </div>

          {!isAnonymous && (
            <div className="form-group">
              <label>Your Name</label>
              <input required={!isAnonymous} type="text" value={formData.reporterName} onChange={e => setFormData({...formData, reporterName: e.target.value})} />
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                <label style={{ margin: 0 }}>Location / Area</label>
                <button type="button" onClick={handleGPS} style={{ background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.8rem' }}>📍 Use My GPS</button>
            </div>
            <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} disabled={gpsLocation !== null} style={gpsLocation ? { color: 'var(--accent-green)', fontWeight: 'bold' } : {}} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea required rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What is happening? E.g., 'A large tree has fallen and blocked the main road.'" />
          </div>

          <div className="form-group">
            <label>Attachment (Image/Video)</label>
            <div className="file-upload-container" style={{ 
              border: '2px dashed rgba(255,255,255,0.1)', 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
              textAlign: 'center',
              position: 'relative',
              background: 'rgba(255,255,255,0.02)'
            }}>
              {!file ? (
                <>
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    onChange={handleFileChange} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                  />
                  <div style={{ color: 'var(--text-dim)' }}>
                    <Paperclip size={24} style={{ marginBottom: '0.5rem' }} />
                    <p>Click or drag to upload image or video</p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.3rem' }} />
                  ) : (
                    <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Paperclip size={20} />
                    </div>
                  )}
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={removeFile} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: 'var(--accent-red)', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '1rem' }}>
            <input type="checkbox" id="emergency" checked={isEmergency} onChange={e => setIsEmergency(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'red' }} />
            <label htmlFor="emergency" style={{ margin: 0, color: 'var(--accent-red)', fontWeight: 'bold', cursor: 'pointer' }}>This is a LIFE-THREATENING emergency</label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '1.5rem' }}>
            {loading ? <span className="animate-pulse">Processing & Analyzing...</span> : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;
