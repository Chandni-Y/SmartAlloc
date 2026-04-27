import React, { useState } from 'react';
import { db, storage } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, FileText, Image as ImageIcon, Video, X, CheckCircle } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";


const NgoUpload = () => {
  const [text, setText] = useState('');
  const [ngoName, setNgoName] = useState('');
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'ngo_uploads'), where('status', '==', 'processed'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUploads(docs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()));
    });
    return () => unsubscribe();
  }, []);

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
      // 1. AI Analysis Strategy: Try Google Gemini First, Fallback to Groq
      const promptText = text;
      const prompt = `Analyze the following crisis findings and extract multiple reports. 
      You must respond ONLY with a valid JSON array of objects, each matching this exact format: 
      [{"reporterName": "Name or Unknown", "location": "Specific Area", "description": "What happened", "type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}].
      Raw text: "${promptText}"`;

      let problems;
      try {
        console.log("Attempting Google Gemini AI for bulk extraction...");
        const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const textResponse = response.text();
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textResponse;
        const parsed = JSON.parse(jsonStr);
        problems = Array.isArray(parsed) ? parsed : (parsed.reports || parsed.problems || [parsed]);
        console.log("Success with Google Gemini!");
      } catch (geminiError) {
        console.warn("Google Gemini failed for bulk extraction, falling back to Groq:", geminiError.message);
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        if (!groqRes.ok) throw new Error("Both Gemini and Groq AI failed.");
        const groqData = await groqRes.json();
        const textResponse = groqData.choices[0].message.content;
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : textResponse;
        const parsed = JSON.parse(jsonStr);
        problems = Array.isArray(parsed) ? parsed : (parsed.reports || parsed.problems || [parsed]);
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
      
      // 4. Save metadata for the list display
      await addDoc(collection(db, 'ngo_uploads'), {
        ngoName: ngoName || "Unknown NGO",
        filename: file ? file.name : "Text Paste",
        timestamp: serverTimestamp(),
        status: 'processed',
        problemCount: problems.length
      });

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
            <label>NGO / Organization Name</label>
            <input 
              type="text" 
              required 
              placeholder="Enter your organization name" 
              value={ngoName} 
              onChange={e => setNgoName(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Findings Description / Context</label>
            <textarea 
              rows="3" 
              placeholder="Paste text findings or add context here..." 
              value={text} 
              onChange={e => setText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Attach Files (Findings, Photos, Videos, Reports)</label>
            <div className="file-upload-container" style={{ 
              border: '2px dashed rgba(255,255,255,0.1)', 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
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
                    <Upload size={28} style={{ marginBottom: '0.5rem', color: 'var(--primary)' }} />
                    <p style={{ fontWeight: '500' }}>Drop files here or click to browse</p>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    {file.type.startsWith('image/') ? <ImageIcon size={32} color="var(--primary)" /> : 
                     file.type.startsWith('video/') ? <Video size={32} color="var(--primary)" /> : 
                     <FileText size={32} color="var(--primary)" />}
                  </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text)' }}>{file.name}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: 'var(--accent-red)', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span className="animate-pulse">Groq AI is Extracting...</span>
              </div>
            ) : 'Extract & Sync with Groq AI'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: logs.length > 0 ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {logs.length > 0 && (
          <div className="glass-card" style={{ maxHeight: '350px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Processing Logs</h3>
            {logs.map((log, i) => (
              <div key={i} style={{ color: log.color, marginBottom: '0.3rem' }}>{log.msg}</div>
            ))}
          </div>
        )}

        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Uploads</h3>
          {uploads.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No uploads recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem', color: 'var(--text-dim)' }}>File / NGO</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-dim)' }}>Date</th>
                    <th style={{ padding: '0.5rem', color: 'var(--text-dim)' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(up => (
                    <tr key={up.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '0.8rem 0.5rem' }}>
                        <div style={{ fontWeight: 'bold' }}>{up.filename}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{up.ngoName}</div>
                      </td>
                      <td style={{ padding: '0.8rem 0.5rem', whiteSpace: 'nowrap' }}>
                        {up.timestamp?.toDate().toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.8rem 0.5rem' }}>{up.problemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NgoUpload;
