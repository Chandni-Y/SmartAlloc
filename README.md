# Smart Resource Allocation MVP

A high-fidelity platform for community crisis management and resource allocation.

## Phase 1: Foundation (Current)
- [x] Premium Dark UI with Glassmorphism.
- [x] Real-time Reporting Form.
- [x] Live Dashboard with Firestore `onSnapshot`.
- [x] Basic Manual Assignment.

## Setup Instructions

1. **Firebase Project**:
   - Create a project at [Firebase Console](https://console.firebase.google.com/).
   - Enable **Cloud Firestore** in Test Mode.
   - Go to Project Settings > General > Your Apps > Web App (Add App).
2. **Configuration**:
   - Copy the `firebaseConfig` object.
   - Paste it into `public/index.html` and `public/problems.html` where marked.
3. **Local Development**:
   - Open `public/index.html` in your browser.
   - Submit a report and watch it appear in `public/problems.html` in real-time.
4. **Deployment**:
   - Install Firebase Tools: `npm install -g firebase-tools`
   - Login: `firebase login`
   - Initialize: `firebase init hosting` (Select `public` as directory)
   - Deploy: `firebase deploy`

## Next Steps: Phase 2 (AI Integration)
- Integrate Gemma to parse `description` into `type`, `severity`, and `peopleAffected`.
- Implement urgency scoring formula: `urgency = severity * peopleAffected + contextBonus`.
- Auto-matching volunteers based on skill sets.
