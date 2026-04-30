# Presentation Outline — MemoryWeaver

Use the CS651 YouTube Slides template linked from the assignment page.
Record a video of the team presenting this content.

---

## Slide Structure

### Slide 1 — Title
- **MemoryWeaver**
- AI-Powered Photo & Voice Memory Journal
- CS651 Web Systems · Group 4
- Sarmad Habib · Anas Niaz · Muhammad Sufiyan

### Slide 2 — App Purpose
- What is MemoryWeaver?
- Problem it solves: digital memories are scattered and context-free
- Solution: combine photos + voice + AI to create rich journal entries
- Who uses it: anyone with Google Photos and voice memories

### Slide 3 — Tech Stack
- Frontend: React 18 + Vite + React Router 6
- Backend: Node.js + Express 4
- AI: Google Gemini 1.5 Flash
- Database: Google Cloud Firestore
- Cloud: Google Cloud Run (Docker)
- Auth: Google OAuth 2.0 (Photos Library API)
- Analytics: Google Analytics 4
- Logging: Google Cloud Logging

### Slide 4 — System Architecture Diagram
[Include the architecture diagram from docs/architecture.md]

### Slide 5 — Screen 1: Login / Landing
[Screenshot of LoginPage.jsx]
- Google OAuth 2.0 sign-in
- Feature overview cards
- Privacy note about read-only Photos access

### Slide 6 — Screen 2: Photo Gallery
[Screenshot of GalleryPage.jsx]
- Fetches photos from Google Photos API
- Processed / New badges
- Process single or all-new photos
- Sync button

### Slide 7 — Gemini Photo Analysis (XXX)
[Screenshot of PhotoResultsPage.jsx]
- Prompt engineering: description + mood + key elements + memory title
- Example output shown

### Slide 8 — Screen 3: Voice Recording
[Screenshot of AudioRecorder.jsx in action]
- Browser MediaRecorder API
- Waveform animation
- Upload to Cloud Storage

### Slide 9 — Gemini Audio Processing (YYY)
[Screenshot of outputYYY result]
- Transcription + summary + keywords + sentiment
- Example output shown

### Slide 10 — Combined Narrative (ZZZ)
[Screenshot of ZZZ narrative on VoiceRecordPage]
- Gemini combines XXX + YYY into a first-person journal entry
- Example narrative shown

### Slide 11 — Screen 5: Journal Timeline
[Screenshot of JournalPage.jsx]
- All entries from Firestore
- Filter tabs: All / Photos / Audio / Narratives
- Search functionality
- Delete entries (CRUD)

### Slide 12 — Screen 6: Database View
[Screenshot of DatabasePage.jsx]
- Firestore collection structure
- Sample documents
- Schema display
- Firestore queries used

### Slide 13 — Firestore Data Model
- photoResults: userId, photoUrl, outputXXX, processedAt
- audioResults: userId, audioUrl, outputYYY, linkedPhotoUrl, processedAt
- combinedResults: userId, photoUrl, audioUrl, outputXXX, outputYYY, outputZZZ, processedAt
- Document ID strategy: SHA-256 hash of URL (deduplication)

### Slide 14 — Analytics & Logging
- GA4: page views, custom events per major user action
- Cloud Logging: structured server-side logs per API call
- Both in production via Cloud Run

### Slide 15 — Deployment
- Docker multi-stage build
- Google Cloud Build → Container Registry
- Cloud Run auto-scaling (0 → N instances)
- Secret Manager for credentials
- [ADD CLOUD RUN URL HERE]

### Slide 16 — Demo Highlights
- Show: Sign in → Gallery sync → Process new photo → Record voice memo → View journal
- Show: Database view with real data
- Show: Adding a new photo to Google Photos → sync → process → updated journal

### Slide 17 — Challenges & Learnings
- Google Photos Library API requires verified/published app for production users
- Gemini audio format support varies by model version
- Session cookie SameSite settings for cross-origin dev/prod setup
- Cloud Run cold starts (mitigated with min-instances=1 if budget allows)

### Slide 18 — Future Work
- Export journal to PDF
- Share individual memories
- Photo album filtering
- Multiple Gemini models comparison
- Notification when batch processing completes

### Slide 19 — Acknowledgements
- Google Cloud / Google AI Studio
- CS651 Professor Grewe
- Group member contributions

### Slide 20 — Q&A
- GitHub: [ADD REPO URL]
- Deployed: [ADD CLOUD RUN URL]
- YouTube: [ADD YOUTUBE URL]
