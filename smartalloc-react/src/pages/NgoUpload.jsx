import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, FileText, Image as ImageIcon, Video, X, CheckCircle } from 'lucide-react';


const NgoUpload = () => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg, color = 'var(--text-dim)') => {
    setLogs(prev => [...prev, { msg, color }]);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      addLog(`[System] File selected: ${selectedFile.name}`);
    }
  };

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

  const handleProcess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLogs([{ msg: "[System] Starting bulk extraction...", color: 'var(--primary)' }]);

    try {
      // API call to Local Ollama (Gemma 2B - No Bandwidth)
      // Note: Text-only model. Image/Video uploads are bypassed for AI analysis.
      let promptText = text;
      if (file && file.type.startsWith('text/')) {
        // If it's a small text file, maybe we could read it, but for now we just rely on the text input
        promptText += " (Note: A file was attached but standard local Gemma processes text only).";
      }

      const prompt = `Analyze the following findings and extract reports.
      Return ONLY a JSON array matching this exact format: [{"reporterName": "Name or Unknown", "location": "Specific Area", "description": "What happened", "type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}].
      Raw text: "${promptText}"`;

      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gemma:2b",
          prompt: prompt,
          stream: false,
          format: "json"
        })
      });

      if (!ollamaRes.ok) throw new Error("Could not connect to local AI. Is Ollama running?");
      const ollamaData = await ollamaRes.json();

      let problems;
      try {
        const textResponse = ollamaData.response.trim();
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textResponse;
        problems = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Raw Output:", ollamaData.response);
        throw new Error("Local Gemma failed to return a valid JSON array.");
      }

      
      addLog(`[AI] Extracted ${problems.length} problems.`, 'var(--accent-green)');

      for (const prob of problems) {
        addLog(`[Process] Mapping: ${prob.location}...`);
        
        // 1. Geocode
        let lat = 0, lng = 0;
        try {
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(prob.location)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`);
          const gData = await gRes.json();
          if (gData.results?.length > 0) {
            lat = gData.results[0].geometry.location.lat;
            lng = gData.results[0].geometry.location.lng;
          }
        } catch (e) {}

        // 2. Logic & Match
        let score = (prob.severity * 2) + (prob.peopleAffected * 1);
        let priority = score > 15 ? "High" : score > 8 ? "Medium" : "Low";
        
        const skillMap = { "Road": "Construction", "Water": "Plumbing", "Sewage": "Cleaning", "Medical": "Medical", "Electricity": "Electrician" };
        const q = query(collection(db, "volunteers"), where("skill", "==", skillMap[prob.type] || "General"), where("status", "==", "available"), limit(1));
        const vSnap = await getDocs(q);
        const suggestedVolunteer = vSnap.empty ? null : vSnap.docs[0].data().name;

        // 3. Save
        await addDoc(collection(db, 'problems'), {
          ...prob,
          priority,
          priorityScore: score,
          status: 'pending',
          suggestedVolunteer,
          lat, lng,
          aiProcessed: true,
          timestamp: serverTimestamp()
        });
        
        addLog(`[Success] Saved ${prob.type} at ${prob.location}`, 'var(--accent-green)');
      }
      
      addLog("[System] Bulk upload complete.", 'var(--accent-green)');
    } catch (error) {
      addLog(`[Error] ${error.message}`, 'var(--accent-red)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>NGO Bulk Upload</h1>
        <p style={{ color: 'var(--text-dim)' }}>AI-driven extraction from unstructured field notes.</p>
      </header>
      
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleProcess}>
          <div className="form-group">
            <label>Findings Description / Context</label>
            <textarea 
              rows="4" 
              placeholder="Add some context or paste text findings here..." 
              value={text} 
              onChange={e => setText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Attach Files (Findings, Photos, Videos, Reports)</label>
            <div className="file-upload-container" style={{ 
              border: '2px dashed rgba(255,255,255,0.1)', 
              borderRadius: '0.5rem', 
              padding: '2rem', 
              textAlign: 'center',
              position: 'relative',
              background: 'rgba(255,255,255,0.02)',
              transition: 'all 0.3s ease'
            }}>
              {!file ? (
                <>
                  <input 
                    type="file" 
                    accept="image/*,video/*,.pdf,.csv,.txt" 
                    onChange={handleFileChange} 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} 
                  />
                  <div style={{ color: 'var(--text-dim)' }}>
                    <Upload size={32} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                    <p style={{ fontWeight: '500' }}>Drop files here or click to browse</p>
                    <p style={{ fontSize: '0.8rem' }}>Supports: JPG, PNG, MP4, PDF, CSV, TXT</p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    {file.type.startsWith('image/') ? <ImageIcon size={40} color="var(--primary)" /> : 
                     file.type.startsWith('video/') ? <Video size={40} color="var(--primary)" /> : 
                     <FileText size={40} color="var(--primary)" />}
                    <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--accent-green)', borderRadius: '50%', padding: '2px' }}>
                      <CheckCircle size={12} color="white" />
                    </div>
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text)' }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: 'var(--accent-red)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="animate-pulse">Local Gemma is Analyzing...</span>
              </div>
            ) : 'Process Findings with Local Gemma'}
          </button>
        </form>
      </div>

      {logs.length > 0 && (
        <div className="glass-card" style={{ maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ color: log.color, marginBottom: '0.3rem' }}>{log.msg}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NgoUpload;
