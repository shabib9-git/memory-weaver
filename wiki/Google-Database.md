# Google Database — MemoryWeaver

## Part 1 — Database Setup and Data Structure

### Chosen Database

**Google Cloud Firestore** in **Native mode** (as required by the assignment).

Firestore is a serverless, NoSQL document database that scales automatically. It is accessed from the Express backend using the `@google-cloud/firestore` SDK.

### Setup Steps

1. Go to [Google Cloud Console → Firestore](https://console.cloud.google.com/firestore)
2. Click **Create Database**
3. Choose **Native mode** (not Datastore mode — important!)
4. Select region: `us-central1` (same as Cloud Run deployment)
5. Click **Create**

No schema migration is required — Firestore is schemaless. Collections and documents are created on first write.

### Collection Structure

MemoryWeaver uses three top-level collections:

---

#### Collection: `photoResults` — Gemini Photo Analysis (XXX)

| Field | Type | Description |
|---|---|---|
| `userId` | string | Google OAuth `sub` — stable unique user identifier |
| `photoUrl` | string | Google Photos `baseUrl` used for Gemini analysis |
| `photoId` | string | Google Photos media item ID |
| `outputXXX` | string | Gemini analysis: description, mood, key elements, memory title |
| `processedAt` | string | ISO 8601 timestamp of when Gemini processed the photo |

**Document ID**: SHA-256 hash of `photoUrl` — ensures idempotent writes (processing the same photo twice does not create duplicates).

---

#### Collection: `audioResults` — Gemini Audio Processing (YYY)

| Field | Type | Description |
|---|---|---|
| `userId` | string | Google OAuth `sub` |
| `audioUrl` | string | Cloud Storage URL of the recorded audio file |
| `outputYYY` | string | Gemini output: transcription, summary, keywords, sentiment |
| `linkedPhotoUrl` | string | Optional — the photo this voice memo is paired with |
| `processedAt` | string | ISO 8601 timestamp |

**Document ID**: SHA-256 hash of `audioUrl`.

---

#### Collection: `combinedResults` — Combined Narrative (ZZZ)

| Field | Type | Description |
|---|---|---|
| `userId` | string | Google OAuth `sub` |
| `photoUrl` | string | Source photo URL |
| `audioUrl` | string | Source audio URL |
| `outputXXX` | string | Photo analysis that was used |
| `outputYYY` | string | Audio analysis that was used |
| `outputZZZ` | string | Gemini-generated combined memory narrative |
| `processedAt` | string | ISO 8601 timestamp |

**Document ID**: SHA-256 hash of `photoUrl::audioUrl`.

---

### Firestore Schema Screenshot

[ADD SCREENSHOT HERE — GCP Console → Firestore showing all three collections]

[ADD SCREENSHOT HERE — Expanded `photoResults` document showing all fields]

---

## Part 2 — How Data is Added, Updated, and Removed

### Adding Data

**Photo result written on POST /api/gemini/photo:**
```javascript
// firestoreService.js — savePhotoResult()
await db.collection('photoResults')
  .doc(urlHash)
  .set({ userId, photoUrl, photoId, outputXXX, processedAt }, { merge: true });
```

**Audio result written on POST /api/gemini/audio:**
```javascript
// firestoreService.js — saveAudioResult()
await db.collection('audioResults')
  .doc(urlHash)
  .set({ userId, audioUrl, outputYYY, linkedPhotoUrl, processedAt }, { merge: true });
```

**Combined result written on POST /api/gemini/combine:**
```javascript
// firestoreService.js — saveCombinedResult()
await db.collection('combinedResults')
  .doc(urlHash)
  .set({ userId, photoUrl, audioUrl, outputXXX, outputYYY, outputZZZ, processedAt }, { merge: true });
```

The `{ merge: true }` option means re-processing the same photo updates the existing document instead of creating a duplicate.

### Reading Data

**Step 3a — Find already-processed photos (deduplication):**
```javascript
const snapshot = await db.collection('photoResults')
  .where('userId', '==', userId)
  .select('photoUrl')
  .get();
```

**Step 6a — Fetch all journal entries for a user:**
```javascript
const snapshot = await db.collection('photoResults')
  .where('userId', '==', userId)
  .orderBy('processedAt', 'desc')
  .get();
```

**Admin sample (Database View screen):**
```javascript
const snapshot = await db.collection('photoResults').limit(20).get();
```

### Removing Data

**DELETE /api/journal/photo/:docId — user deletes a journal entry:**
```javascript
await db.collection('photoResults').doc(docId).delete();
```

### Screenshot Evidence

[ADD SCREENSHOT HERE — After uploading audio, audioResults document visible in Firestore]

[ADD SCREENSHOT HERE — After delete action, document removed from Firestore console]

[ADD SCREENSHOT HERE — combinedResults document showing ZZZ field populated]
