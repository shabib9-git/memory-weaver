# Analytics + Logging — MemoryWeaver

## Analytics & Logging Report

The full report is available as a PDF in this repository:

> [Analytics-Logging-Report.pdf](../docs/analytics-logging-report.md) (convert to PDF for submission)

---

## Summary

### Google Analytics 4 (Frontend — Client-Side)

MemoryWeaver uses **react-ga4** to send page views and custom events to Google Analytics 4.

**Measurement ID:** `G-XXXXXXXXXX` (set in `VITE_GA4_MEASUREMENT_ID`)

**Events tracked:**

| Event | Trigger |
|---|---|
| `Login` | Successful Google OAuth completion |
| `Logout` | User clicks Sign Out |
| `Photos_Sync` | Gallery fetches from Google Photos |
| `Photo_Process` | Gemini photo analysis completes |
| `Record_Start` | User starts recording |
| `Record_Stop` | User stops recording |
| `Audio_Process` | Gemini audio analysis completes |
| `Combine` | Combined narrative generated |
| `Journal_View` | Journal page loads with entry count |
| `Database_View` | Database admin screen opens |

**GA4 Dashboard Screenshots:**

[ADD SCREENSHOT HERE — GA4 dashboard showing page views over time]

[ADD SCREENSHOT HERE — GA4 Events report showing custom event list]

[ADD SCREENSHOT HERE — GA4 DebugView during an active session]

---

### Google Cloud Logging (Backend — Server-Side)

All Express API calls are logged via `@google-cloud/logging` in production.

**Log name:** `memory-weaver`

**Log entry structure:**
```json
{
  "action": "Gemini_Photo_Process",
  "endpoint": "gemini.generateContent/photo",
  "success": true,
  "userId": "116...",
  "timestamp": "2026-04-22T18:30:00.000Z",
  "outputLength": 450
}
```

**Events logged:**

| Action | Description |
|---|---|
| `OAuth_Initiate` | User starts Google OAuth flow |
| `OAuth_Callback` | Authorization code exchanged for tokens |
| `OAuth_RefreshToken` | Access token refreshed |
| `GooglePhotos_Fetch` | Google Photos mediaItems.list call |
| `Gemini_Photo_Process` | Gemini image analysis |
| `Gemini_Audio_Process` | Gemini audio transcription/summary |
| `Gemini_Combine` | Combined narrative generation |
| `Firestore_Add` | Document written to Firestore |
| `Firestore_Query` | Document(s) read from Firestore |
| `Firestore_Delete` | Document deleted from Firestore |
| `CloudStorage_Upload` | Audio file uploaded to GCS |

**Cloud Logging Screenshots:**

[ADD SCREENSHOT HERE — Cloud Logging → Log Explorer with memory-weaver entries]

[ADD SCREENSHOT HERE — Expanded structured log entry showing all fields]

---

## Comparison: GA4 vs Cloud Logging

**Google Analytics 4** is a client-side analytics tool designed for understanding *user behavior*. It aggregates anonymized events to answer product questions: "What is the most-visited screen?", "How many users processed photos this week?", "What events happen before a user reaches the journal?"

**Google Cloud Logging** is a server-side operational logging service designed for *system reliability*. It records every API call with full context (user, endpoint, success/failure, timestamps) enabling debugging, auditing, and monitoring. It integrates with Cloud Monitoring for alerting on errors.

For MemoryWeaver:
- **GA4** measures *engagement* — are users using all screens? Which Gemini feature is most popular?
- **Cloud Logging** measures *correctness* — are API calls succeeding? Are Firestore writes completing?

Together they provide 360° observability: frontend journey analytics from GA4, and backend reliability data from Cloud Logging.

| Dimension | GA4 | Cloud Logging |
|---|---|---|
| Location | Client (browser) | Server (Node.js) |
| Purpose | User behavior analytics | Operational monitoring |
| Data granularity | Aggregated, anonymized | Per-request, with userId |
| Storage | Google Analytics servers | GCP Cloud Logging |
| Access | GA4 Dashboard (analytics.google.com) | Log Explorer / gcloud CLI |
| Cost | Free (with limits) | Free up to 50 GB/month |
| Real-time | ~30 second delay / DebugView | Near real-time |
