# Proposal — MemoryWeaver

## Original Proposal PDF

> [Proposal.pdf](../Project_2_Proposal.pdf)

The original proposal was submitted to Canvas → Discussion Board → Project 2 Proposals.

---

## Proposal Summary

**Application Name:** MemoryWeaver — AI-Powered Photo & Voice Memory Journal

**Course:** CS651 Web Systems (Spring 2026) — Group 4

**Team Members:**
- Sarmad Habib (vf3352)
- Anas Niaz (te7008)
- Muhammad Sufiyan (ev8962)

---

## App Purpose

MemoryWeaver is a personal digital journal that combines photos from a social platform (Google Photos) with voice-recorded memories to create rich, AI-enhanced narratives. The app helps users preserve and reflect on moments by:

1. **Pulling photos from Google Photos** — users connect their account and select albums or recent photos
2. **Recording voice memos in-app** — users describe the context, feelings, or story behind each photo
3. **Processing with Google Gemini:**
   - Each photo → output XXX (description, mood, key visual elements)
   - Each audio → output YYY (transcription + summary)
   - Both combined → output ZZZ (cohesive memory narrative)
4. **Storing in Google Firestore** — all results persisted and keyed by photo/audio URLs
5. **Presenting results** — timeline/journal view with photos, descriptions, transcriptions, and narratives

---

## Mockup Interfaces (as proposed)

The following screens were designed in the proposal:

- **Screen 1:** Login/Landing — "Sign in with Google" OAuth button
- **Screen 2:** Photo Gallery — Grid of Google Photos with Sync/Process/Voice Memo actions
- **Screen 3:** Voice Recording — Selected photo + Record button + waveform + YYY result
- **Screen 4:** Photo Processing Results — Photo + XXX analysis (description, mood, elements)
- **Screen 5:** Journal/Timeline — Chronological list with XXX, YYY, ZZZ per entry
- **Screen 6:** Database View — Firestore document structure for demo purposes

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER (Browser)                                               │
│  React SPA • OAuth flow • Photo gallery • Voice recording   │
│  Journal view • GA4 analytics                               │
└─────────────────────────────────────────────────────────────┘
          │ OAuth        │ API calls
          ▼              ▼
┌────────────────┐  ┌────────────────────────────────────────┐
│ Google Photos  │  │ Node.js + Express (Backend)            │
│ (Social Net X) │  │ /auth/google, /auth/callback           │
│ OAuth 2.0      │  │ /api/photos, /api/gemini/*             │
│ Photos API     │  │ /api/journal, /api/admin               │
└────────────────┘  └────────────────────────────────────────┘
                              │              │
                              ▼              ▼
                    ┌──────────────┐ ┌──────────────────┐
                    │ Google Gemini│ │ Google Firestore  │
                    │ Image → XXX  │ │ photoResults     │
                    │ Audio → YYY  │ │ audioResults     │
                    │ Combined→ZZZ │ │ combinedResults  │
                    └──────────────┘ └──────────────────┘
                    Deployed on Google Cloud Run
```

---

## Flow of Control (as implemented)

1. **Step 1+2:** User authenticates via Google OAuth → Photos API access granted → `GET /api/photos` returns photo list
2. **Step 3a:** Backend queries Firestore → filters photos without `photoResults` entry → `UserPhotosNew[]`
3. **Step 3b:** For each new photo → Gemini API (`analyzePhoto()`) → `outputXXX` → saved to Firestore `photoResults`
4. **Step 4a:** User records audio in-browser (MediaRecorder API) → Blob sent to `POST /api/gemini/audio`
5. **Step 4b:** Backend uploads audio to Cloud Storage → `audioUrl`
6. **Step 4c:** Gemini API (`processAudio()`) → `outputYYY` → saved to Firestore `audioResults`
7. **Step 5 (optional):** `POST /api/gemini/combine` → Gemini combines XXX + YYY → `outputZZZ` → Firestore `combinedResults`
8. **Step 6:** `GET /api/journal` → Firestore query → Journal entries displayed in React SPA

---

## What Changed from Proposal to Implementation

| Proposal | Implementation | Reason |
|---|---|---|
| Google Photos as Social Network X | ✅ Implemented exactly | Photos Library API supports this |
| MediaRecorder for audio | ✅ Implemented | Browser API works well |
| Cloud Storage for audio | ✅ Implemented with data-URI fallback | Fallback added for devs without GCS bucket |
| Session-based auth | ✅ express-session with httpOnly cookies | More secure than JWT for this use case |
| All 3 Gemini outputs (XXX, YYY, ZZZ) | ✅ Implemented | Non-trivial structured prompts |
| 6 screens from mockup | ✅ All 6 implemented | Close match to proposal mockups |
