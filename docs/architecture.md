# MemoryWeaver — System Architecture

## Overview

MemoryWeaver is a Single Page Application (SPA) built on the ERN stack (Express + React + Node.js) with Google Cloud services for AI processing, data storage, and deployment.

```
┌─────────────────────────────────────────────────────────────────┐
│ USER BROWSER                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ React SPA (Vite + React Router 6)                       │   │
│  │  Screen 1: Login/Landing  Screen 4: Photo Results       │   │
│  │  Screen 2: Gallery        Screen 5: Journal Timeline    │   │
│  │  Screen 3: Voice Record   Screen 6: Database View       │   │
│  │                                                          │   │
│  │  Services Layer: api.js (axios + session cookies)       │   │
│  │  Analytics: react-ga4 → Google Analytics 4             │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────│───────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXPRESS BACKEND (Node.js 20 / Google Cloud Run)                 │
│                                                                  │
│  Middleware Stack:                                               │
│    helmet → morgan → cors → express-session → routes           │
│                                                                  │
│  Route Modules:            Service Modules:                     │
│    /auth/*                   authService.js (OAuth2)            │
│    /api/photos               photosService.js (Photos API)      │
│    /api/gemini               geminiService.js (Gemini SDK)      │
│    /api/journal              firestoreService.js (Firestore)    │
│    /api/admin                storageService.js (GCS)            │
│                              loggingService.js (Cloud Logging)  │
└────┬──────────┬─────────────────┬───────────────┬──────────────┘
     │          │                  │               │
     ▼          ▼                  ▼               ▼
┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────────┐
│ Google   │ │ Google     │ │ Google   │ │ Google Cloud     │
│ Photos   │ │ Gemini     │ │ Firestore│ │ Storage + Logging│
│ Library  │ │ API        │ │          │ │                  │
│ API      │ │            │ │ 3 colls: │ │ Audio files      │
│          │ │ Photo →XXX │ │ photo-   │ │ Structured logs  │
│ OAuth2   │ │ Audio →YYY │ │ Results  │ │                  │
│ mediaItems│ │ Combine→ZZZ│ │ audio-   │ │                  │
│ .list    │ │            │ │ Results  │ │                  │
│          │ │            │ │ combined │ │                  │
└──────────┘ └────────────┘ └──────────┘ └──────────────────┘
```

## Data Flow — Photo Processing (Step 3)

```
User → GalleryPage → fetchPhotos() → GET /api/photos
  → photosService.fetchUserPhotos() → Google Photos API → Photo[]
  → firestoreService.getProcessedPhotoUrls() → Firestore (dedup)
  → Returns annotated Photo[] to SPA

User clicks "Process" → POST /api/gemini/photo
  → photosService.downloadPhotoBytes() → image Buffer
  → geminiService.analyzePhoto() → Gemini API → XXX (string)
  → firestoreService.savePhotoResult() → Firestore photoResults
  → Returns { outputXXX, firestoreId } to SPA
```

## Data Flow — Audio Processing (Step 4)

```
User records in browser → AudioRecorder component → Blob (webm)
User clicks "Process" → POST /api/gemini/audio (multipart)
  → storageService.uploadAudio() → Cloud Storage → audioUrl
  → geminiService.processAudio() → Gemini API → YYY (string)
  → firestoreService.saveAudioResult() → Firestore audioResults
  → Returns { outputYYY, audioUrl, firestoreId } to SPA
```

## Data Flow — Combined Narrative (Step 5)

```
User clicks "Generate Narrative" → POST /api/gemini/combine
  → geminiService.combineOutputs(XXX, YYY) → Gemini API → ZZZ
  → firestoreService.saveCombinedResult() → Firestore combinedResults
  → Returns { outputZZZ, firestoreId } to SPA
```

## Firestore Data Model

### Collection: `photoResults`
```json
{
  "userId":      "Google OAuth sub (stable user ID)",
  "photoUrl":    "Google Photos baseUrl",
  "photoId":     "Google Photos media item ID",
  "outputXXX":   "Gemini photo analysis text",
  "processedAt": "ISO 8601 timestamp"
}
```
Document ID: SHA-256 hash of `photoUrl` (enables deduplication)

### Collection: `audioResults`
```json
{
  "userId":         "Google OAuth sub",
  "audioUrl":       "Cloud Storage URL of audio file",
  "outputYYY":      "Gemini transcription + summary text",
  "linkedPhotoUrl": "Optional paired photo URL",
  "processedAt":    "ISO 8601 timestamp"
}
```
Document ID: SHA-256 hash of `audioUrl`

### Collection: `combinedResults`
```json
{
  "userId":     "Google OAuth sub",
  "photoUrl":   "Source photo URL",
  "audioUrl":   "Source audio URL",
  "outputXXX":  "Photo analysis used",
  "outputYYY":  "Audio analysis used",
  "outputZZZ":  "Combined memory narrative",
  "processedAt": "ISO 8601 timestamp"
}
```
Document ID: SHA-256 hash of `photoUrl::audioUrl`

## Authentication Flow

```
Browser → GET /auth/google
  → authService.buildAuthUrl() → Google OAuth consent URL
  → Redirect to Google

Google → GET /auth/callback?code=...
  → authService.exchangeCodeForTokens(code) → { access_token, refresh_token, id_token }
  → authService.decodeIdToken(id_token) → { sub, email, name, picture }
  → req.session = { user, tokens, tokenExpiry }
  → Redirect to SPA /gallery

SPA → GET /auth/me → { authenticated: true, user }
  → AuthContext stores user in React state
```

## Security Architecture

| Concern | Mitigation |
|---|---|
| API key exposure | All keys server-side only; never sent to browser |
| Session hijacking | httpOnly + secure cookies; sameSite protection |
| CORS | Explicit allow-list (frontendUrl only) |
| Token expiry | Proactive refresh in authMiddleware |
| XSS | React escapes all output; helmet sets security headers |
| Secrets in git | .gitignore blocks .env; .env.example has no values |

## Logging Architecture

All service calls log a structured entry via `loggingService.js`:

```
{ action, endpoint, success, userId, timestamp, ...meta }
```

- **Development**: console.log only
- **Production**: Cloud Logging (GCP Logging → Log Explorer)

Logged events:
- `GooglePhotos_Fetch` — Photos API list call
- `Gemini_Photo_Process` — Gemini image analysis
- `Gemini_Audio_Process` — Gemini audio processing
- `Gemini_Combine` — Combined narrative generation
- `Firestore_Add` — Write operations
- `Firestore_Query` — Read operations
- `Firestore_Delete` — Delete operations
- `OAuth_Initiate`, `OAuth_Callback`, `OAuth_RefreshToken`
- `CloudStorage_Upload` — Audio file upload
