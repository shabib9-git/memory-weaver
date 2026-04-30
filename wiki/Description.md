# Description — MemoryWeaver

## Commit History

[ADD SCREENSHOT HERE — GitHub repository → Commits tab showing full history]

---

## Issue Board Progress (5 Screenshots Over Time)

Screenshot 1 — Early development (backend scaffolding):
[ADD SCREENSHOT HERE]

Screenshot 2 — Mid-development (frontend screens started):
[ADD SCREENSHOT HERE]

Screenshot 3 — Integration (Gemini + Firestore connected):
[ADD SCREENSHOT HERE]

Screenshot 4 — Testing phase (most issues closed):
[ADD SCREENSHOT HERE]

Screenshot 5 — Final (all issues closed or in review):
[ADD SCREENSHOT HERE]

---

## Major Code Files and Their Functions

### Backend

| File | Purpose |
|---|---|
| `server/index.js` | Express server entry point. Wires middleware (helmet, cors, morgan, session) and registers all route modules. Serves the React SPA static files in production. |
| `server/config/env.js` | Central environment variable configuration. Loads `.env`, validates required vars, and exports a typed config object used throughout the backend. |
| `server/services/authService.js` | Google OAuth 2.0 helpers. Builds the authorization URL, exchanges the auth code for tokens, decodes the ID token for user profile, and refreshes expired access tokens. |
| `server/services/photosService.js` | Google Photos Library API integration. Fetches a user's media items using their OAuth access token, downloads image bytes for Gemini processing. |
| `server/services/geminiService.js` | Google Gemini API integration. Three functions: `analyzePhoto()` → XXX (description, mood, elements, title); `processAudio()` → YYY (transcription, summary, keywords, sentiment); `combineOutputs()` → ZZZ (combined narrative). Uses @google/generative-ai SDK. |
| `server/services/firestoreService.js` | Firestore data access layer. Saves/reads photoResults (XXX), audioResults (YYY), and combinedResults (ZZZ). Implements deduplication via SHA-256 URL hashing. Provides admin sample and delete operations. |
| `server/services/storageService.js` | Google Cloud Storage integration. Uploads user audio recordings to GCS and returns a public URL. Falls back to data-URI when GCS is not configured. |
| `server/services/loggingService.js` | Unified logging layer. Writes structured log entries (action, endpoint, success, userId, timestamp) to Google Cloud Logging in production and console in development. |
| `server/routes/auth.js` | Auth route handlers: GET /auth/google (start OAuth), GET /auth/callback (code exchange + session creation), GET /auth/me (session check), POST /auth/logout. |
| `server/routes/photos.js` | Photo route handlers: GET /api/photos (fetch + annotate with processed flags), GET /api/photos/new (unprocessed only), POST /api/photos/process (batch Gemini processing). |
| `server/routes/gemini.js` | Gemini route handlers: POST /api/gemini/photo (single photo → XXX), POST /api/gemini/audio (audio → YYY via multer), POST /api/gemini/combine (XXX + YYY → ZZZ). |
| `server/routes/journal.js` | Journal route handlers: GET /api/journal (all entries from Firestore), DELETE /api/journal/photo/:id (CRUD delete demo). |
| `server/routes/admin.js` | Admin/database-view route handlers: GET /api/admin/database (Firestore collection sample), GET /api/admin/health (service config status). |
| `server/middleware/authMiddleware.js` | Express middleware that protects API routes. Checks for valid session; proactively refreshes expired access tokens. |
| `server/middleware/errorHandler.js` | Central Express error handler. Returns consistent JSON error envelopes; hides stack traces in production. |

### Frontend

| File | Purpose |
|---|---|
| `client/src/App.jsx` | Root React component. Sets up BrowserRouter, AuthProvider, and React Router v6 route definitions for all 6 screens. Includes ProtectedRoute wrapper and GA4 page-view tracking. |
| `client/src/context/AuthContext.jsx` | React context for authentication state. Checks session on mount via /auth/me; exposes `user`, `isAuthenticated`, `logout()`, `refreshUser()`. |
| `client/src/services/api.js` | Axios-based HTTP service layer. Centralizes all API calls to the Express backend with credential cookies and consistent error handling. |
| `client/src/utils/analytics.js` | Google Analytics 4 integration. Initializes react-ga4 with GA4 Measurement ID; provides typed event-tracking helpers for all major user actions. |
| `client/src/pages/LoginPage.jsx` | Screen 1 — Login/Landing. Displays brand, feature cards, "Sign in with Google" button, and OAuth error handling. |
| `client/src/pages/GalleryPage.jsx` | Screen 2 — Photo Gallery. Fetches and displays user's Google Photos with processed/new badges. Supports single-photo and batch Gemini processing. |
| `client/src/pages/VoiceRecordPage.jsx` | Screen 3 — Voice Recording. Browser MediaRecorder API integration. Sends audio to Gemini, displays YYY output, and optionally generates ZZZ narrative. |
| `client/src/pages/PhotoResultsPage.jsx` | Screen 4 — Photo Results. Displays full Gemini XXX analysis for a single photo with structured sections (description, mood, elements, title). |
| `client/src/pages/JournalPage.jsx` | Screen 5 — Journal Timeline. Chronological list of all Firestore entries with search, filter tabs, and delete. |
| `client/src/pages/DatabasePage.jsx` | Screen 6 — Database View. Firestore data structure visualization, service health panel, sample documents, and Firestore query examples. |
| `client/src/components/Navbar.jsx` | Fixed top navigation bar with brand, screen links, user avatar, and logout. |
| `client/src/components/PhotoCard.jsx` | Photo grid card component with thumbnail, processed badge, and Process/Voice Memo/View Result actions. |
| `client/src/components/AudioRecorder.jsx` | Browser-based audio recorder. Uses MediaRecorder API with waveform visualization (Web Audio API), countdown timer, and playback. |
| `client/src/components/JournalEntry.jsx` | Collapsible journal entry card displaying photo thumbnail, XXX/YYY/ZZZ content, badges, and delete button. |
| `client/src/components/LoadingSpinner.jsx` | Reusable animated spinner with optional message and full-page centering. |

### Configuration & Deployment

| File | Purpose |
|---|---|
| `server/config/env.js` | All env var declarations and validation |
| `.env.example` | Template with instructions for all required environment variables |
| `Dockerfile` | Multi-stage Docker build: Stage 1 builds React SPA, Stage 2 runs Express with production node_modules only |
| `docker-compose.yml` | Local development environment with hot-reload for both server and client |
| `.gitignore` | Excludes secrets, node_modules, and build artifacts from git |
