# Local Development Setup Guide — MemoryWeaver

This guide walks you through everything needed to run MemoryWeaver on your local machine.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | Bundled with Node |
| Git | any | https://git-scm.com |
| Google Chrome | latest | Required for MediaRecorder API |

---

## Step 1 — Google Cloud Project Setup

### 1.1 Create a GCP Project
1. Go to https://console.cloud.google.com/
2. Click **New Project** → name it `memory-weaver`
3. Note your **Project ID** (e.g. `memory-weaver-abc123`)

### 1.2 Enable Required APIs
In the GCP Console → **APIs & Services → Library**, enable:
- **Google Photos Library API** (for photo access)
- **Cloud Firestore API** (for data storage)
- **Cloud Storage API** (for audio file uploads)
- **Cloud Logging API** (for structured logging)

### 1.3 Create OAuth 2.0 Credentials
1. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
2. Application type: **Web application**
3. **Authorized JavaScript origins**: `http://localhost:5173`
4. **Authorized redirect URIs**: `http://localhost:8080/auth/callback`
5. Download the credentials JSON; extract `client_id` and `client_secret`

> **Important:** The Google Photos Library API requires your OAuth consent screen to be configured. Under "Scopes," add `https://www.googleapis.com/auth/photoslibrary.readonly`.

### 1.4 Create a Service Account (for Firestore + Logging)
1. **IAM & Admin → Service Accounts → Create Service Account**
2. Name: `memory-weaver-dev`
3. Add roles:
   - **Cloud Datastore User** (or Firestore User)
   - **Storage Object Admin**
   - **Logs Writer**
4. **Keys → Add Key → JSON** — download the JSON file
5. Note the file path (you'll set it as `GOOGLE_APPLICATION_CREDENTIALS`)

### 1.5 Create Firestore Database
1. **Firestore → Create Database**
2. Choose **Native mode** (not Datastore mode)
3. Location: `us-central1` (or closest to you)
4. Required collections are created automatically on first write

### 1.6 Create Cloud Storage Bucket
1. **Cloud Storage → Create Bucket**
2. Name: `memory-weaver-audio-<YOUR_PROJECT_ID>` (must be globally unique)
3. Location: same region as Firestore
4. Access: **Fine-grained**
5. After creation, set CORS (required for browser audio upload):
```json
[
  {
    "origin": ["http://localhost:5173", "http://localhost:8080"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```
Upload this as `cors.json` and run:
```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json
```

---

## Step 2 — Get a Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Click **Create API Key**
3. Copy the key

---

## Step 3 — Clone and Install

```bash
# Clone the repository
git clone <YOUR_GITHUB_REPO_URL>
cd memory-weaver

# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

---

## Step 4 — Configure Environment

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and fill in:
```env
SESSION_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
GOOGLE_CLIENT_ID=<from Step 1.3>
GOOGLE_CLIENT_SECRET=<from Step 1.3>
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/callback
GEMINI_API_KEY=<from Step 2>
GCP_PROJECT_ID=<your GCP project ID>
GOOGLE_APPLICATION_CREDENTIALS=<absolute path to service account JSON>
GCS_BUCKET_NAME=<bucket name from Step 1.6>
FRONTEND_URL=http://localhost:5173
```

For the React SPA, create `client/.env.local`:
```env
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## Step 5 — Run Locally

Open **two terminals**:

### Terminal 1 — Express backend
```bash
cd server
npm run dev
# Server starts at http://localhost:8080
```

### Terminal 2 — React SPA
```bash
cd client
npm run dev
# SPA starts at http://localhost:5173
```

Open http://localhost:5173 in Chrome.

---

## Step 6 — Verify Everything Works

1. **Login page** loads at http://localhost:5173
2. Click **Sign in with Google** → Google OAuth consent screen opens
3. Grant access → redirected back to `/gallery`
4. Click **Sync Photos** → your Google Photos appear
5. Click **Process** on a photo → Gemini analyses it
6. Navigate to **Record** → record a voice memo → process with Gemini
7. Navigate to **Journal** → see combined entries
8. Navigate to **Database** → see Firestore data structure

---

## Common Issues

| Issue | Solution |
|---|---|
| `GOOGLE_CLIENT_ID not set` | Copy `.env.example` to `.env` and fill in values |
| `Photos API 403 Forbidden` | Add test users to OAuth consent screen; enable Photos Library API |
| `Gemini API error` | Verify `GEMINI_API_KEY` is valid; check usage quota at aistudio.google.com |
| `Firestore connection error` | Check `GOOGLE_APPLICATION_CREDENTIALS` path; verify Firestore is Native mode |
| `MediaRecorder not working` | Use Chrome; allow microphone access in browser settings |
| Session cookie missing | Make sure both server (8080) and client (5173) are running; Vite proxy handles routing |
