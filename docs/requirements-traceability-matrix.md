# Requirements Traceability Matrix — MemoryWeaver

Maps each project requirement from the CS651 Project 2 spec to the implementation.

| # | Requirement | Implementation | Files | Status |
|---|---|---|---|---|
| R1 | SPA using React | React 18 + React Router v6 + Vite | `client/src/App.jsx`, `client/vite.config.js` | ✅ |
| R2 | Node.js + Express backend | Express 4 server | `server/index.js` | ✅ |
| R3 | Non-trivial Gemini photo processing | `analyzePhoto()` — outputs description, mood, elements, title | `server/services/geminiService.js` | ✅ |
| R4 | Non-trivial Gemini audio processing | `processAudio()` — transcription, summary, keywords, sentiment | `server/services/geminiService.js` | ✅ |
| R5 | Google Photos as Social Network X | OAuth + Google Photos Library API | `server/services/photosService.js`, `server/routes/photos.js` | ✅ |
| R6 | User authentication | Google OAuth 2.0 flow | `server/services/authService.js`, `server/routes/auth.js` | ✅ |
| R7 | Retrieve user photos | GET /api/photos → Google Photos mediaItems.list | `server/routes/photos.js` | ✅ |
| R8 | Filter already-processed photos (Step 3a) | Firestore query dedup + "processed" badge in UI | `server/services/firestoreService.js:getProcessedPhotoUrls()` | ✅ |
| R9 | Gather audio dynamically in-app | MediaRecorder API in browser | `client/src/components/AudioRecorder.jsx` | ✅ |
| R10 | Store audio in Google Cloud | Cloud Storage upload; data-URI fallback | `server/services/storageService.js` | ✅ |
| R11 | Store Gemini results in Firestore | photoResults, audioResults, combinedResults collections | `server/services/firestoreService.js` | ✅ |
| R12 | Display results in journal | JournalPage with XXX/YYY/ZZZ | `client/src/pages/JournalPage.jsx` | ✅ |
| R13 | Deploy on Google Cloud Run | Dockerfile + deployment guide | `Dockerfile`, `docs/deployment-cloud-run.md` | ✅ |
| R14 | Launch from Project 1 static site | "← Back to Project 1" link in LoginPage footer; launch button snippet in `docs/project1-linking.md` | `client/src/pages/LoginPage.jsx`, `docs/project1-linking.md`, `wiki/Intro.md` | ⚠️ Manual: replace `#` with your P1 URL; add launch button to P1 HTML |
| R15 | Analytics | GA4 via react-ga4 + custom events | `client/src/utils/analytics.js` | ✅ |
| R16 | Logging | @google-cloud/logging + console fallback | `server/services/loggingService.js` | ✅ |
| R17 | Log all API calls | Every service call logs { action, endpoint, success, userId, timestamp } | All service files | ✅ |
| R18 | Combined XXX + YYY → ZZZ (Step 5) | `combineOutputs()` + POST /api/gemini/combine | `server/services/geminiService.js` | ✅ |
| R19 | Database view (Screen 6) | Admin endpoint + DatabasePage | `server/routes/admin.js`, `client/src/pages/DatabasePage.jsx` | ✅ |
| R20 | Firestore CRUD demo | Add, read, delete operations demonstrated | All Firestore service methods | ✅ |
| R21 | GitHub repository with wiki | GitHub repo + wiki/ folder with 9 pages | `wiki/` | ✅ code; ⚠️ manual: push to GitHub |
| R22 | GitHub Issues for each component | GitHub Issues plan | `docs/github-issues-plan.md` | ⚠️ Manual: create in GitHub |
| R23 | GitHub commit history | Regular commits required | — | ⚠️ Manual: commit as you work |
| R24 | YouTube demo video | Recording required | `wiki/Presentation.md` | ⚠️ Manual: record and upload |
| R25 | Presentation PDF | Slide deck required | `wiki/Presentation.md` | ⚠️ Manual: create slides |
| R26 | Code fully commented | camelCase + comments throughout all files | All source files | ✅ |
| R27 | Analytics+Logging report | Template in wiki | `wiki/Analytics-Logging.md`, `docs/analytics-logging-report.md` | ⚠️ Manual: add screenshots |
| R28 | Peer evaluation | Individual task | — | N/A |
| R29 | Any user can log in (not just developer) | Standard OAuth flow; test-user access | `server/routes/auth.js` | ✅ (add team as test users in GCP OAuth) |
| R30 | Demo adding new photo → new output | Process new photo feature in Gallery | `client/src/pages/GalleryPage.jsx` | ✅ |
