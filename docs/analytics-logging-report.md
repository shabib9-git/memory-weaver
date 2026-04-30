# Analytics & Logging Report — MemoryWeaver

CS651 Web Systems · Project 2 · Group 4

---

## 1. Analytics Implementation — Google Analytics 4 (GA4)

### Setup

MemoryWeaver integrates **Google Analytics 4** via the `react-ga4` library (wraps gtag.js). The Measurement ID is stored in `VITE_GA4_MEASUREMENT_ID` (injected at build time by Vite).

Initialization (`client/src/utils/analytics.js`):
```javascript
ReactGA.initialize(GA4_ID, { gaOptions: { send_page_view: false } });
```

Page views are sent manually on each React Router route change via `PageTracker` in `App.jsx`.

### Events Tracked

| Event Category | Action | Trigger |
|---|---|---|
| Auth | Login | Successful Google OAuth completion |
| Auth | Logout | User clicks Sign Out |
| Photos | Sync | Gallery fetches from Google Photos API |
| Gemini | Photo_Process | Gemini photo analysis runs |
| Audio | Record_Start | User clicks Record button |
| Audio | Record_Stop | User stops recording |
| Gemini | Audio_Process | Gemini audio analysis runs |
| Gemini | Combine | Combined narrative generated |
| Journal | View | Journal page loads |
| Admin | Database_View | Database page loads |

### GA4 Dashboard Evidence

[ADD SCREENSHOT HERE — GA4 dashboard overview page]

[ADD SCREENSHOT HERE — GA4 Events list showing custom events]

[ADD SCREENSHOT HERE — GA4 DebugView during an active session]

---

## 2. Server-Side Logging — Google Cloud Logging

### Setup

The Express backend uses **@google-cloud/logging** (Google Cloud Logging Node.js library). In development, all events print to the console. In production (Cloud Run), entries are written to Cloud Logging with severity levels.

Every service call logs a structured entry:
```javascript
{
  action:    "Gemini_Photo_Process",
  endpoint:  "gemini.generateContent/photo",
  success:   true,
  userId:    "google-sub-id",
  timestamp: "2026-04-22T18:30:00.000Z",
  outputLength: 450
}
```

### Events Logged

| Action | Endpoint | Logged in |
|---|---|---|
| OAuth_Initiate | /auth/google | authService, routes/auth |
| OAuth_Callback | /auth/callback | authService, routes/auth |
| OAuth_RefreshToken | /auth/refresh | authService |
| GooglePhotos_Fetch | mediaItems.list | photosService |
| GooglePhotos_FetchById | mediaItems/:id | photosService |
| Gemini_Photo_Process | gemini.generateContent/photo | geminiService |
| Gemini_Audio_Process | gemini.generateContent/audio | geminiService |
| Gemini_Combine | gemini.generateContent/combine | geminiService |
| Firestore_Add | photoResults/audioResults/combinedResults | firestoreService |
| Firestore_Query | photoResults/audioResults/combinedResults | firestoreService |
| Firestore_Delete | photoResults | firestoreService |
| CloudStorage_Upload | audio | storageService |

### Cloud Logging Evidence

[ADD SCREENSHOT HERE — Cloud Logging → Log Explorer with MemoryWeaver entries]

[ADD SCREENSHOT HERE — Expanded log entry showing structured fields]

---

## 3. Comparison: GA4 vs Cloud Logging

**Google Analytics 4** is client-side analytics focused on *user behavior*. It tracks sessions, page views, and custom events to answer questions like "How many users processed photos?" and "What is the most-used screen?" GA4 is ideal for product analytics, A/B testing, and understanding the user journey.

**Google Cloud Logging** is server-side operational logging focused on *system behavior*. It records every API call, error, and processing event with structured metadata (userId, endpoint, success, timestamp). Cloud Logging is essential for debugging, auditing, and monitoring API usage. It integrates with Cloud Monitoring for alerting.

For MemoryWeaver, GA4 tells us *what* users do (engagement analytics), while Cloud Logging tells us *how* the system responds (operational reliability). Together they provide full observability: GA4 for the frontend journey and Cloud Logging for backend correctness.

**Key Differences:**

| Dimension | GA4 | Cloud Logging |
|---|---|---|
| Side | Client (browser) | Server (Node.js) |
| Purpose | User behavior analytics | Operational monitoring |
| Data | Aggregated, anonymized | Detailed, per-request |
| Storage | Google Analytics servers | Cloud Logging (GCP) |
| Access | GA4 Dashboard | Log Explorer / gcloud CLI |
| Cost | Free (up to limits) | Free up to 50 GB/month |
| Real-time | DebugView / ~30s delay | Near real-time |

---

## 4. Log Comparison Table

| Metric | GA4 Value | Cloud Logging Value |
|---|---|---|
| Total page views | [ADD AFTER RUNNING] | N/A (server metric) |
| Login events | [ADD AFTER RUNNING] | Count of OAuth_Callback SUCCESS |
| Gemini photo calls | Count of Gemini_Photo_Process events | Count of Gemini_Photo_Process log entries |
| Gemini audio calls | Count of Gemini_Audio_Process events | Count of Gemini_Audio_Process log entries |
| Failed API calls | Not tracked (client sees errors) | Count of success=false entries |

---

*Report prepared by Group 4 — Sarmad Habib, Anas Niaz, Muhammad Sufiyan*
*CS651 Web Systems · Spring 2026*
