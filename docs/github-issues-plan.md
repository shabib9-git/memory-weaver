# GitHub Issues Plan — MemoryWeaver

Create one GitHub Issue per component/code file as required by the assignment.
Copy these into your GitHub repository under Issues.

---

## Issues to Create

| # | Title | Label | Assignee |
|---|---|---|---|
| 1 | `server/index.js` — Express server setup and middleware wiring | backend | sarmad |
| 2 | `server/config/env.js` — Environment variable validation | backend | sarmad |
| 3 | `server/services/authService.js` — Google OAuth 2.0 flow | backend | anas |
| 4 | `server/routes/auth.js` — Auth endpoint handlers | backend | anas |
| 5 | `server/middleware/authMiddleware.js` — Session protection middleware | backend | anas |
| 6 | `server/services/photosService.js` — Google Photos API integration | backend | sufiyan |
| 7 | `server/routes/photos.js` — Photo fetch and batch-process endpoints | backend | sufiyan |
| 8 | `server/services/geminiService.js` — Gemini photo/audio/combine inference | backend | sarmad |
| 9 | `server/routes/gemini.js` — Gemini API endpoint handlers | backend | sarmad |
| 10 | `server/services/firestoreService.js` — Firestore CRUD operations | backend | anas |
| 11 | `server/routes/journal.js` — Journal data retrieval + delete | backend | anas |
| 12 | `server/services/storageService.js` — GCS audio upload | backend | sufiyan |
| 13 | `server/services/loggingService.js` — Cloud Logging integration | backend | sufiyan |
| 14 | `server/routes/admin.js` — Admin database view endpoint | backend | sarmad |
| 15 | `server/middleware/errorHandler.js` — Central error handling | backend | sarmad |
| 16 | `client/src/App.jsx` — React Router setup and ProtectedRoute | frontend | anas |
| 17 | `client/src/context/AuthContext.jsx` — Authentication state management | frontend | anas |
| 18 | `client/src/pages/LoginPage.jsx` — Screen 1: Login/Landing | frontend | sufiyan |
| 19 | `client/src/pages/GalleryPage.jsx` — Screen 2: Photo Gallery | frontend | sufiyan |
| 20 | `client/src/pages/VoiceRecordPage.jsx` — Screen 3: Voice Recording | frontend | sarmad |
| 21 | `client/src/pages/PhotoResultsPage.jsx` — Screen 4: Photo Results | frontend | sarmad |
| 22 | `client/src/pages/JournalPage.jsx` — Screen 5: Journal Timeline | frontend | anas |
| 23 | `client/src/pages/DatabasePage.jsx` — Screen 6: Database View | frontend | anas |
| 24 | `client/src/components/Navbar.jsx` — Navigation bar component | frontend | sufiyan |
| 25 | `client/src/components/PhotoCard.jsx` — Photo card component | frontend | sufiyan |
| 26 | `client/src/components/AudioRecorder.jsx` — Browser recording component | frontend | sarmad |
| 27 | `client/src/components/JournalEntry.jsx` — Journal entry component | frontend | sarmad |
| 28 | `client/src/components/LoadingSpinner.jsx` — Loading indicator | frontend | anas |
| 29 | `client/src/services/api.js` — Frontend HTTP service layer | frontend | anas |
| 30 | `client/src/utils/analytics.js` — GA4 analytics integration | frontend | sufiyan |
| 31 | `Dockerfile` — Multi-stage production build | devops | sufiyan |
| 32 | Google Cloud Run deployment | devops | sarmad |
| 33 | Firestore database setup and schema | devops | anas |
| 34 | Google OAuth consent screen configuration | devops | sarmad |
| 35 | GitHub Wiki documentation | docs | all |

---

## How to Create Issues

1. Go to your GitHub repository
2. Click **Issues → New Issue**
3. Title: copy from the table above
4. Body: include the file path, its purpose, and a checkbox list of subtasks
5. Labels: create labels `backend`, `frontend`, `devops`, `docs`
6. Assign to the appropriate team member

---

## Issue Body Template

```markdown
## File
`server/services/geminiService.js`

## Purpose
Implements non-trivial Google Gemini API integration for photo analysis (XXX),
audio transcription/summary (YYY), and combined narrative generation (ZZZ).

## Tasks
- [x] analyzePhoto() — sends image to Gemini with structured prompt
- [x] processAudio() — sends audio blob to Gemini for transcription + summary
- [x] combineOutputs() — generates ZZZ narrative from XXX + YYY
- [x] Error handling + logging for all three functions
- [ ] Test with real Gemini API key

## Notes
Requires GEMINI_API_KEY environment variable.
Uses @google/generative-ai SDK v0.21+.
```

---

## Milestone Suggestions

Create these milestones to track progress:
1. **Backend Core** — Issues 1–15
2. **Frontend UI** — Issues 16–30
3. **Deployment & Docs** — Issues 31–35
