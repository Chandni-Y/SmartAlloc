import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';

const NgoUpload = () => {
  const [text, setText] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg, color = 'var(--text-dim)') => {
    setLogs(prev => [...prev, { msg, color }]);
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLogs([{ msg: "[System] Starting bulk extraction...", color: 'var(--primary)' }]);

    try {
      // API call to Local Ollama (Gemma 2B)
      const prompt = `Analyze this raw text: "${text}". Extract multiple crisis reports and return ONLY a JSON array matching this exact format: [{"reporterName": "Name or Unknown", "location": "Specific Area", "description": "What happened", "type": "Road"|"Water"|"Sewage"|"Medical"|"Electricity"|"Other", "severity": 5, "peopleAffected": 10}]. Do not include markdown formatting or any extra text.`;
      
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
        problems = JSON.parse(ollamaData.response.trim());
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
            <label>Raw Field Notes / WhatsApp Messages</label>
            <textarea 
              rows="10" 
              required 
              placeholder="Paste field reports here..." 
              value={text} 
              onChange={e => setText(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'AI is Processing...' : 'Process with Gemini AI'}
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
