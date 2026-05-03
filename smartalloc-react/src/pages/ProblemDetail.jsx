import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getDistanceKm } from '../utils/geo';
import { ArrowLeft, Star, MapPin, Clock, User, AlertCircle, CheckCircle, CircleUser, Activity } from 'lucide-react';

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [problem, setProblem] = useState(null);
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const probRef = doc(db, 'problems', id);
        const probSnap = await getDoc(probRef);
        if (probSnap.exists()) {
          const probData = { id: probSnap.id, ...probSnap.data() };
          setProblem(probData);

          // Fetch volunteer if assigned
          if (probData.assignedVolunteerId) {
            const vRef = doc(db, 'volunteers', probData.assignedVolunteerId);
            const vSnap = await getDoc(vRef);
            if (vSnap.exists()) {
              setVolunteer({ id: vSnap.id, ...vSnap.data() });
            }
          }

          // Check if already rated
          if (currentUser) {
            const rQuery = query(collection(db, `problems/${id}/ratings`), where('ratedBy', '==', currentUser.uid));
            const rSnap = await getDocs(rQuery);
            if (!rSnap.empty) {
              setAlreadyRated(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching problem details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, currentUser]);

  const handleRate = async () => {
    if (!currentUser || !problem || !volunteer) return;
    setRatingLoading(true);
    setRatingError('');
    
    try {
      // 1. Determine eligibility
      const isReporter = problem.reporterName === currentUser.displayName || problem.reportedBy === currentUser.uid;
      let isNear = false;
      
      if (!isReporter && problem.lat && problem.lng) {
        // Need to check location
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        const dist = getDistanceKm(pos.coords.latitude, pos.coords.longitude, problem.lat, problem.lng);
        if (dist <= 5.0) { // Extended to 5 km for better usability
          isNear = true;
        } else {
          throw new Error("You must be within 5km of the problem location to rate the volunteer.");
        }
      }

      // 2. Save rating
      await addDoc(collection(db, `problems/${id}/ratings`), {
        ratedBy: currentUser.uid,
        stars,
        review,
        timestamp: serverTimestamp()
      });

      // 3. Update volunteer stats
      const volRef = doc(db, 'volunteers', volunteer.id);
      const currentTotal = volunteer.totalRatings || 0;
      const currentAvg = volunteer.averageRating || 0;
      
      const newTotal = currentTotal + 1;
      const newAvg = ((currentAvg * currentTotal) + stars) / newTotal;

      await updateDoc(volRef, {
        totalRatings: newTotal,
        averageRating: newAvg
      });

      setRatingSuccess(true);
      setAlreadyRated(true);
      alert("Rating submitted successfully!");
    } catch (err) {
      setRatingError(err.message || "Failed to submit rating. Please try again.");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Loading details...</div>;
  if (!problem) return <div style={{ textAlign: 'center', marginTop: '3rem' }}>Problem not found.</div>;

  return (
    <div className="responsive-container">
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', fontWeight: 'bold' }}>
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <span className={`priority-badge priority-${problem.priority}`}>{problem.priority} Priority</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{problem.type}</span>
            </div>
            <h1 style={{ marginBottom: '1rem', fontSize: '1.8rem' }}>{problem.description}</h1>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.3rem' }}><User size={14} style={{ display: 'inline', marginRight: '5px' }}/>Reported By</p>
            <p style={{ fontWeight: '500' }}>{problem.reporterName || "Anonymous"}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.3rem' }}><MapPin size={14} style={{ display: 'inline', marginRight: '5px' }}/>Location</p>
            <p style={{ fontWeight: '500' }}>{problem.location}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.3rem' }}><Clock size={14} style={{ display: 'inline', marginRight: '5px' }}/>Time Submitted</p>
            <p style={{ fontWeight: '500' }}>{problem.timestamp ? new Date(problem.timestamp.toDate()).toLocaleString() : "Recently"}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.3rem' }}><AlertCircle size={14} style={{ display: 'inline', marginRight: '5px' }}/>Severity Score</p>
            <p style={{ fontWeight: '500', color: 'var(--accent-red)' }}>{problem.severity || 'N/A'}/10</p>
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Responder Mission Status</h2>
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        {volunteer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CircleUser size={30} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>{volunteer.name}</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Skills: {(volunteer.skills || []).join(', ')}</p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#facc15', fontWeight: 'bold' }}><Star size={16} fill="currentColor"/> {(volunteer.averageRating || 0).toFixed(1)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{volunteer.tasksCompleted || 0} missions completed</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1rem' }}>
            <Activity className="animate-pulse" style={{ margin: '0 auto 1rem' }} />
            <p>Awaiting responder acceptance. AI has dispatched notifications to qualified volunteers.</p>
          </div>
        )}
      </div>

      {problem.status === 'done' && volunteer && !alreadyRated && (
        <div className="glass-card" style={{ border: '1px solid var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Rate the Mission Completion</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Help us maintain high quality response. Share your feedback on the volunteer's work.
          </p>
          
          {ratingError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>{ratingError}</div>}
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[1, 2, 3, 4, 5].map(s => (
              <Star 
                key={s} 
                size={32} 
                onClick={() => setStars(s)} 
                color={s <= stars ? '#facc15' : 'var(--text-dim)'} 
                fill={s <= stars ? '#facc15' : 'none'}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>

          <div className="form-group">
            <textarea 
              rows="3" 
              placeholder="Leave a short review (optional)" 
              value={review}
              onChange={e => setReview(e.target.value)}
            />
          </div>

          <button onClick={handleRate} disabled={ratingLoading} className="btn-primary" style={{ width: 'auto' }}>
            {ratingLoading ? 'Verifying Proximity...' : 'Submit Rating'}
          </button>
        </div>
      )}

      {alreadyRated && (
        <div className="glass-card" style={{ textAlign: 'center', border: '1px solid var(--accent-green)', background: 'rgba(34, 197, 94, 0.05)' }}>
          <CheckCircle size={40} style={{ color: 'var(--accent-green)', margin: '0 auto 1rem' }} />
          <h3>Thank you for your rating!</h3>
        </div>
      )}

    </div>
  );
};

export default ProblemDetail;
