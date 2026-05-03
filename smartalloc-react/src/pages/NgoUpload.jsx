import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { Upload, FileText, Image as ImageIcon, X, CheckCircle, Database, Activity, Terminal, Cloud, List, Plus, LayoutGrid, Clock } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const NgoUpload = () => {
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'history'
  const [text, setText] = useState('');
  const [ngoName, setNgoName] = useState('');
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'ngo_uploads'), where('status', '==', 'processed'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUploads(docs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()));
    });
    return () => unsubscribe();
  }, []);

  const addLog = (msg, color = 'var(--text-dim)') => {
    setLogs(prev => [{ msg, color, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLogs([]);
    addLog("Initializing Sync Protocol v4.2...", 'var(--primary)');

    try {
      const prompt = `Analyze: "${text}". Respond ONLY with JSON array: [{"reporterName": "Name", "location": "Area", "description": "What", "type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}].`;

      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const problems = JSON.parse(result.response.text().match(/\[[\s\S]*\]/)[0]);

      addLog(`Extraction complete. ${problems.length} incidents found.`, 'var(--accent-green)');

      for (const prob of problems) {
        addLog(`Mapping: ${prob.location}...`);
        
        let lat = 0, lng = 0;
        try {
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(prob.location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
          const gData = await gRes.json();
          if (gData.results?.length > 0) {
            lat = gData.results[0].geometry.location.lat;
            lng = gData.results[0].geometry.location.lng;
          }
        } catch (e) {}

        const sectorWeights = { "Medical": 1.6, "Electricity": 1.4, "Water": 1.1, "Road": 1.0, "Sewage": 0.8 };
        const weight = sectorWeights[prob.type] || 1.0;
        let score = ((prob.severity * 2) + (prob.peopleAffected * 0.5)) * weight;
        let priority = score > 18 ? "High" : score > 10 ? "Medium" : "Low";
        
        const skillMap = { "Road": "Construction", "Water": "Plumbing", "Sewage": "Cleaning", "Medical": "Medical", "Electricity": "Electrician" };
        const requiredSkill = skillMap[prob.type] || "General";

        await addDoc(collection(db, 'problems'), {
          ...prob,
          priority,
          priorityScore: score,
          status: 'pending',
          requiredSkill,
          lat, lng,
          aiProcessed: true,
          timestamp: serverTimestamp()
        });
        addLog(`Deployment target created: ${prob.type} @ ${prob.location}`, 'var(--accent-green)');
      }
      
      await addDoc(collection(db, 'ngo_uploads'), {
        ngoName: ngoName || "Field Agent",
        filename: file ? file.name : "Text Stream",
        timestamp: serverTimestamp(),
        status: 'processed',
        problemCount: problems.length
      });

      addLog("Synchronization sequence finalized.", 'var(--accent-green)');
      setTimeout(() => setActiveTab('history'), 2000);
    } catch (error) {
      addLog(`Critical Failure: ${error.message}`, 'var(--accent-red)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="responsive-container animate-fade" style={{ maxWidth: '1100px' }}>
      <header style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Data Operations Hub</h1>
            <p style={{ color: 'var(--text-dim)' }}>Synchronize field observations with the central dispatch network.</p>
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-card-solid)', padding: '0.3rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <button 
              onClick={() => setActiveTab('new')}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '0.8rem', border: 'none', background: activeTab === 'new' ? 'var(--primary)' : 'transparent', color: activeTab === 'new' ? 'white' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> New Sync
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '0.8rem', border: 'none', background: activeTab === 'history' ? 'var(--primary)' : 'transparent', color: activeTab === 'history' ? 'white' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 'bold', transition: 'var(--transition)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Clock size={18} /> History
            </button>
          </div>
        </div>
      </header>
      
      {activeTab === 'new' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }} className="animate-fade">
          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <form onSubmit={handleProcess}>
              <div className="form-group">
                <label>Issuing Organization</label>
                <div style={{ position: 'relative' }}>
                  <Database size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                  <input type="text" required placeholder="E.g. United Nations, Local Fire Dept" value={ngoName} onChange={e => setNgoName(e.target.value)} style={{ paddingLeft: '3rem' }} />
                </div>
              </div>

              <div className="form-group">
                <label>Bulk Field Observations (Paste Data)</label>
                <textarea rows="8" placeholder="Paste reports here... E.g. 'Found a major water leak at 5th St, about 10 homes affected. Also a downed pole nearby.'" value={text} onChange={e => setText(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Media Source (Optional)</label>
                <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '1rem', padding: '2rem', textAlign: 'center', position: 'relative', background: 'rgba(255,255,255,0.02)' }}>
                  {!file ? (
                    <>
                      <input type="file" onChange={e => setFile(e.target.files[0])} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                      <Cloud size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Attach logs or evidence media</p>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
                      <FileText size={24} style={{ color: 'var(--primary)' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>{file.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Ready for sync</p>
                      </div>
                      <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><X size={18}/></button>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1.2rem', marginTop: '1rem' }}>
                {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><Activity className="animate-pulse" /> SYNCHRONIZING...</span> : 'Initiate Bulk Sync'}
              </button>
            </form>
          </div>

          
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }} className="animate-fade">
          {uploads.map(up => (
            <div key={up.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <CheckCircle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{up.ngoName}</h4>
                <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{up.filename}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-dim)' }}>{up.timestamp?.toDate().toLocaleDateString()}</span>
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 'bold' }}>{up.problemCount} Reports</span>
                </div>
              </div>
            </div>
          ))}
          {uploads.length === 0 && <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem' }}>No sync history recorded.</div>}
        </div>
      )}
    </div>
  );
};

export default NgoUpload;
