# SmartAlloc 🛡️
### AI-Powered Smart Resource Allocation & Crisis Management

SmartAlloc is a premium, high-fidelity platform designed for rapid community response during crises. It uses advanced AI to analyze problem reports, calculate urgency in real-time, and automatically match them with the right volunteers and resources.

![SmartAlloc Banner](https://github.com/Chandni-Y/SmartAlloc/raw/main/smartalloc-react/src/assets/hero.png)

## 🚀 Key Features

- **AI-Driven Analysis**: Uses Groq (Llama 3) or Google Gemini to instantly parse reports into structured data (Type, Severity, Impact).
- **Dynamic Urgency Scoring**: A mathematical model ranks problems based on severity, people affected, and external factors like weather conditions.
- **Real-Time Dashboard**: A live feed of incidents with status tracking (Pending, Assigned, Resolved).
- **Smart Volunteer Matching**: Automatically identifies and suggests nearby volunteers based on specific skill sets (Medical, Plumbing, Construction, etc.).
- **NGO Resource Management**: Dedicated portal for NGOs to upload and track resource availability.
- **Geospatial & Contextual Intelligence**: Integrated GPS coordinates and real-time weather data from OpenWeather API.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind-inspired Vanilla CSS.
- **Backend**: Firebase Firestore (Real-time NoSQL).
- **AI**: Groq API (Llama 3.3) / Google Gemini SDK.
- **Icons**: Lucide React.
- **APIs**: Google Maps Geocoding, OpenWeatherMap.

## 📦 Setup & Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Chandni-Y/SmartAlloc.git
   cd SmartAlloc/smartalloc-react
   ```

2. **Install Dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `smartalloc-react` directory and add your credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_key
   VITE_GROQ_API_KEY=your_groq_key
   VITE_GOOGLE_MAPS_API_KEY=your_maps_key
   VITE_OPENWEATHER_API_KEY=your_weather_key
   ```

4. **Run Locally**:
   ```bash
   npm run dev
   ```

## 🗺️ Roadmap

- [x] Phase 1: Core Foundation (Form & Dashboard)
- [x] Phase 2: AI Integration (Gemma/Llama logic)
- [/] Phase 3: Geospatial mapping and NGO portal integration.
- [ ] Phase 4: Mobile-first PWA for field volunteers.

---
Built with ❤️ for the future of community resilience.
