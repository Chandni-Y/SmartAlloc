# SmartAlloc React Frontend 🛡️

This is the main React application for the SmartAlloc platform.

## Quick Start

1. Install: `npm install --legacy-peer-deps`
2. Configure `.env` with your Firebase and AI keys.
3. Run: `npm run dev`

## Project Structure

- `/src/pages`:
  - `Home.jsx`: The main problem reporting form with AI analysis.
  - `Dashboard.jsx`: Live monitoring of all reported issues.
  - `Volunteer.jsx`: Volunteer registration page.
  - `VolunteerList.jsx`: List of registered volunteers.
  - `NgoUpload.jsx`: Portal for NGOs to upload resources.
- `/src/firebase.js`: Firebase initialization and Firestore export.

## AI Integration

This project uses **Groq (Llama 3)** and **Google Gemini** to process natural language problem reports. It automatically extracts:
- Problem Type
- Severity
- Estimated number of people affected

It then applies a priority score to ensure the most urgent issues are handled first.
