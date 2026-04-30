# 🧵 MemoryWeaver

**AI-Powered Photo & Voice Memory Journal**

CS651 Web Systems · Project 2 · Group 4  
Sarmad Habib (vf3352) · Anas Niaz (te7008) · Muhammad Sufiyan (ev8962)

---

## Overview

MemoryWeaver is a Single Page Application (SPA) that lets users:

1. **Connect Google Photos** — Import personal photos via OAuth 2.0
2. **Record voice memos** — Capture audio in-browser using MediaRecorder API
3. **Process with Google Gemini** — Analyse photos (→ XXX), transcribe audio (→ YYY), and generate combined memory narratives (→ ZZZ)
4. **Store results in Firestore** — All Gemini outputs persist in Google Cloud Firestore
5. **View a memory journal** — Chronological timeline of all processed memories

## Architecture

```
┌─────────────────────────────────────┐
│  React SPA (Vite + React Router 6)  │  Port 5173 (dev)
│  6 screens · GA4 analytics          │
└───────────────┬─────────────────────┘
                │ HTTP (proxied in dev)
                ▼
┌─────────────────────────────────────┐
│  Express Backend (Node.js 20)       │  Port 8080
│  /auth  /api/photos  /api/gemini    │
│  /api/journal  /api/admin           │
└────┬──────────┬────────┬────────────┘
     │          │        │
     ▼          ▼        ▼
 Google      Gemini   Firestore
 Photos API  API      (Firestore)
             ↓
         Cloud Storage (audio files)
         Cloud Logging  (structured logs)
```

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Google Cloud project with APIs enabled (see docs/setup-local.md)
- A Google account with Google Photos

### 1. Clone and install

```bash
git clone <YOUR_REPO_URL>
cd memory-weaver

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials (see instructions inside)

# For the React SPA (Vite reads VITE_* vars from .env.local)
cp client/.env.local.example client/.env.local
# Edit client/.env.local and set VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Run locally

```bash
# Terminal 1 — Express backend
cd server && npm run dev

# Terminal 2 — React SPA
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (aistudio.google.com) |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth 2.0 client secret |
| `SESSION_SECRET` | ✅ | Random string for session encryption |
| `GCP_PROJECT_ID` | ✅ | Google Cloud project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local dev | Path to service account JSON |
| `GCS_BUCKET_NAME` | ✅ | GCS bucket for audio uploads |
| `FRONTEND_URL` | ✅ | URL of the React SPA |
| `GOOGLE_CALLBACK_URL` | ✅ | OAuth callback URL |

See `.env.example` for full documentation.

## Deployment (Google Cloud Run)

See [docs/deployment-cloud-run.md](docs/deployment-cloud-run.md) for the full step-by-step guide.

Quick summary:
```bash
# Build and push the Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/memory-weaver

# Deploy to Cloud Run
gcloud run deploy memory-weaver \
  --image gcr.io/YOUR_PROJECT/memory-weaver \
  --platform managed \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=..." \
  --allow-unauthenticated
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/auth/google` | Start OAuth flow |
| GET | `/auth/callback` | OAuth callback |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Destroy session |
| GET | `/api/photos` | Fetch user's photos |
| POST | `/api/photos/process` | Batch process photos with Gemini |
| POST | `/api/gemini/photo` | Analyse single photo → XXX |
| POST | `/api/gemini/audio` | Process audio → YYY |
| POST | `/api/gemini/combine` | Generate narrative → ZZZ |
| GET | `/api/journal` | Fetch all journal entries |
| DELETE | `/api/journal/photo/:id` | Delete a journal entry |
| GET | `/api/admin/database` | Firestore data sample |
| GET | `/api/admin/health` | Service health status |

## Project Structure

```
memory-weaver/
├── client/                  # React SPA
│   └── src/
│       ├── pages/           # 6 screen components
│       ├── components/      # Reusable components
│       ├── services/api.js  # HTTP service layer
│       ├── context/         # Auth context
│       └── utils/           # Analytics
├── server/                  # Express backend
│   ├── routes/              # Route handlers
│   ├── services/            # Business logic
│   ├── middleware/          # Auth & error handling
│   └── config/env.js        # Environment config
├── docs/                    # Setup & deployment docs
├── wiki/                    # GitHub wiki pages
├── Dockerfile
└── docker-compose.yml
```

## Documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/setup-local.md](docs/setup-local.md)
- [docs/deployment-cloud-run.md](docs/deployment-cloud-run.md)
- [docs/testing-checklist.md](docs/testing-checklist.md)
- [docs/requirements-traceability-matrix.md](docs/requirements-traceability-matrix.md)

## License

Academic project — CS651 CSU East Bay · Spring 2026
