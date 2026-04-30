# MemoryWeaver — Presentation Script
**CS 651 Web Systems · Spring 2026 · Group 4**
**Presenter: Mohammed Sufiyan (ev8962)**
**Estimated duration: 8–12 minutes**

---

> **Setup before recording:**
> - Open the live app: https://memory-weaver-1009624055497.us-west1.run.app
> - Have the slides open side by side or share your screen on the slides
> - Sign out first so you can demonstrate the login flow
> - Have a photo ready in your Google Drive
> - Speak clearly, at a steady pace — don't rush

---

## [SLIDE 1 — Title]

*[Start recording. Look at the camera or screen. Smile.]*

"Hello everyone. My name is Mohammed Sufiyan, and I'm presenting on behalf of Group 4 for CS 651 Web Systems, Spring 2026.

Our team members are Sarmad Habib, Anas Niaz, and myself, Mohammed Sufiyan.

Today I'll be walking you through our project — **MemoryWeaver** — an AI-powered photo and voice memory journal.

Let's get into it."

---

## [SLIDE 2 — The Problem]

"So, why did we build this?

Think about how many photos you have sitting in your Google Drive or phone right now. Hundreds, maybe thousands. But when was the last time you actually went back and *remembered* the moment behind a photo?

And think about voice notes. Most of us record quick voice memos and forget them entirely.

The problem we identified is this: **photos and voice recordings are captured separately, with no connection between them, and no story to tie them together.**

There's no easy way to say: 'this photo was taken on that evening when I recorded this note.' MemoryWeaver solves exactly that."

---

## [SLIDE 3 — Our Solution]

"MemoryWeaver is a **Single Page Application** — a web app that runs in the browser — with four core capabilities.

**First** — it syncs your photos directly from your Google Drive account using Google's OAuth system.

**Second** — it lets you record a voice memo right in the browser, no app needed. You just click record, speak, and stop.

**Third** — it sends both the photo AND the voice recording to Google Gemini, Google's AI model. Gemini analyses the photo, transcribes the audio, and then — crucially — **combines them into a single, rich memory narrative**.

**Fourth** — it stores everything in a personal memory journal that you can search, filter, and revisit.

Think of it as an AI that helps you write the captions your memories deserve."

---

## [SLIDE 4 — Architecture]

"Let me walk you through how it's built technically.

On the **frontend**, we used **React 18** with **Vite** as our build tool. This gives us a fast, modern single-page application.

On the **backend**, we have **Node.js** with **Express** — a REST API server that handles all the business logic.

For **AI processing**, we're using **Google Gemini 2.5 Flash Lite** — Google's latest efficient language and vision model.

For the **database**, we're using **Google Cloud Firestore** — a fully managed NoSQL document database. All our AI results are stored there.

For **file storage** — specifically audio recordings — we use **Google Cloud Storage**. The audio files are stored in a private bucket and served through our server so they're never publicly exposed.

For **photos**, we integrated the **Google Drive API** as our Social Network X — this is where users' photos come from.

**Authentication** is handled by **Google OAuth 2.0** with server-side encrypted sessions.

And the whole application is **deployed on Google Cloud Run** — a serverless container platform — using a Docker container built through Google Cloud Build.

We also added **Google Analytics 4** for client-side event tracking and **Google Cloud Logging** for structured server-side logs."

---

## [SLIDE 5 — AI Pipeline]

"Now let me explain the AI pipeline — this is the heart of the application.

We have three stages, which we call **XXX**, **YYY**, and **ZZZ**.

**XXX — Photo Analysis.** When a user selects a photo, our server downloads the image bytes and sends them directly to Google Gemini. We ask Gemini to return a structured response with five fields: a description of the photo, the mood or emotional tone, the location or setting, a list of key visual elements, and a short memory title. Gemini returns this as formatted plain text that we parse on the server.

**YYY — Audio Transcription.** When the user records a voice memo, the audio is uploaded to Google Cloud Storage and the bytes are sent to Gemini. We ask Gemini to transcribe it and also provide a summary, keywords, and the sentiment of what was said.

**ZZZ — Combined Narrative.** This is the magic step. We take the XXX output and the YYY output and send them both to Gemini together, asking it to write a single cohesive memory narrative — a paragraph that tells the full story of that moment, in the user's voice but with Gemini's narrative quality.

The ZZZ result is saved to Firestore and displayed in the journal, where the user can also edit it inline if they want to personalise it."

---

## [SLIDE 6 — Social Network X: Google Drive]

"Our Social Network X is **Google Drive**.

When a user signs in with their Google account, they grant us read-only access to their Drive files using OAuth 2.0. Our server then calls the Google Drive API to list their image files and display them in the Gallery.

One technical challenge here: Drive images can't be loaded directly in the browser because they require authentication. So we built a **server-side proxy** — the browser requests `/api/photos/drive/:fileId`, our Express server fetches the image from Drive using the user's access token, and streams it back to the browser. The user never needs to think about this — the images just appear.

We track which Drive file IDs have already been analysed in Firestore, so the Gallery shows a green 'Analysed' badge on processed photos and a 'Process' button on unprocessed ones.

Users can also upload local photos from their device if they prefer not to use Drive."

---

## [SLIDE 7 — Database Design]

"For the database, we use **Google Cloud Firestore** in Native mode.

We have **three collections** — one for each type of AI output.

**photoResults** stores the XXX photo analysis. Each document has a userId, the photo URL, the Drive file ID, the source type, the full Gemini output, a SHA-256 hash of the URL for deduplication, and a timestamp.

**audioResults** stores the YYY transcription. Each document has the userId, the audio URL pointing to our Cloud Storage proxy, and the Gemini output.

**combinedResults** stores the ZZZ narrative. It links the photo and audio together and stores all three outputs — XXX, YYY, and ZZZ — in one document. If the user edits the ZZZ narrative, we also store an updatedAt timestamp.

All four database operations are implemented: **Create** when Gemini processes new content, **Read** for the journal timeline, **Update** when the user edits a narrative, and **Delete** when entries are removed.

Critically, every document stores a userId field. Every query is scoped to `where userId equals the logged-in user`. And every update or delete operation verifies ownership before executing — so one user's data is never accessible to another."

---

## [LIVE DEMO — Switch to browser]

*[Switch to browser with the app open. Sign out first if you're signed in.]*

"Let me show you the application live.

**[Login screen]**
This is the login page. You can see the four feature cards describing what the app does, and the 'Sign in with Google' button. Let me click it.

*[Click Sign in with Google — complete OAuth flow]*

**[Gallery screen]**
After login, I'm taken to the Gallery. You can see my Google Drive photos loaded here. The ones with the green 'Analysed' badge have already been processed by Gemini. Let me click 'View Result' on one of these.

*[Click View Result on an analysed photo]*

**[Photo Results screen]**
Here's the Gemini photo analysis — XXX. You can see the memory title it generated, the description, the mood it detected, the location, and the key visual elements. This all came from a single prompt to Gemini with the image.

Let me go back and try the Voice Recording.

*[Click Voice Memo on a photo card]*

**[Voice Recording screen]**
Here's the Voice Recording screen. The photo is on the left. On the right is the audio recorder with a live waveform. Let me record a short voice note.

*[Click Start Recording — speak for 5–10 seconds — click Stop]*

'That evening in San Francisco was incredible. The city lights, the bay bridge in the distance — it felt like the city was putting on a show just for us.'

*[Wait for Gemini to process — show YYY result]*

You can see the transcription, the summary, the keywords, and the sentiment Gemini detected.

Now let me generate the combined narrative.

*[Click Generate Narrative — wait — show ZZZ result]*

And here's the ZZZ — the combined memory narrative. Gemini has taken the photo description and the voice note and written a full memory in prose. If I want to change anything, I can click Edit right here and modify it inline.

**[Journal screen]**
Let me open the Journal.

*[Click Journal in nav]*

Here are all my saved memories in chronological order. I can see the mood and location badges, the memory title, and whether each entry has a photo, voice, or narrative. Let me open the filter panel.

*[Click Filter button]*

I can filter by date range, mood, location, and whether entries have a voice memo or narrative. This makes it easy to find specific memories.

**[Database screen]**
Finally, here's the Database page.

*[Click Database in nav]*

This shows the live Firestore data — you can see all five services are green: Gemini, Google OAuth, Firestore, Cloud Storage, and Cloud Logging. And below that is the data model showing our three Firestore collections."

---

## [SLIDE 8 — Security]

*[Switch back to slides]*

"Let me touch on security briefly, because this is important.

All API routes are protected by our **requireAuth middleware**, which verifies the session and automatically refreshes expired Google access tokens.

Every Firestore document stores the owner's userId, and every mutation — update or delete — checks that the requesting user's ID matches the document's userId before proceeding. This prevents one user from accessing or modifying another user's data.

We use **Helmet** for HTTP security headers, and the Express server is configured with `trust proxy: 1` to correctly handle HTTPS secure cookies behind Google Cloud Run's load balancer.

Audio files in Google Cloud Storage are in a private bucket — they cannot be accessed directly. They're served through our `/api/audio/stream` endpoint, which verifies the user's session before streaming the file."

---

## [SLIDE 9 — Deployment]

"For deployment, the application is packaged as a **Docker container** using a multi-stage Dockerfile.

Stage 1 runs the Vite build to produce the optimised React SPA.
Stage 2 runs the Express server and serves the built frontend.

This container is built via **Google Cloud Build** and pushed to **Google Artifact Registry**. From there, it's deployed to **Google Cloud Run** in the us-west1 region.

Cloud Run is serverless — it automatically scales the container up when requests come in and down to zero when idle. This means we don't pay for compute when no one is using the app.

All environment variables — API keys, session secrets, project IDs — are injected as Cloud Run service configuration, never hardcoded.

The live application is accessible at:
**memory-weaver-1009624055497.us-west1.run.app**"

---

## [SLIDE 10 — Analytics & Logging]

"We implemented two observability systems.

For **Google Analytics 4**, we use the react-ga4 package on the frontend. Every page navigation fires a page_view event automatically. We also track custom events: login, photo analysed, audio record start, audio processed, narrative generated, and journal viewed.

For **Google Cloud Logging**, every API call on the backend is logged as a structured JSON entry to the memory-weaver-api log in Cloud Logging. Each entry contains the action name, endpoint, success flag, user ID, and timestamp. This gives us full traceability of every Gemini call, Firestore operation, Drive API fetch, and authentication event.

In the Logs Explorer, you can filter all our logs with the query:
`logName equals projects/ws-project02/logs/memory-weaver-api`

And see every operation the backend has performed, for every user, in real time."

---

## [SLIDE 12 — What We Learned]

"A few key technical lessons we took away from this project.

**Google Drive images need a server-side proxy.** You cannot load Drive images directly in a browser with a standard img tag because they require OAuth authentication. We had to build a proxy endpoint that fetches and streams the images server-side.

**Cloud Run needs trust proxy configuration.** When Express runs behind Cloud Run's load balancer, `req.secure` is false by default, which breaks secure cookie sessions. Setting `app.set trust proxy 1` fixes this.

**Google Cloud Storage uniform bucket access blocks public URLs.** Our GCS bucket uses uniform IAM access control, which means we couldn't call `makePublic()` on audio files. The solution was to stream audio through a backend proxy endpoint instead.

**Gemini prompt structure matters.** We found that explicitly labelling each output field — like MOOD colon, LOCATION colon — made Gemini's responses much more reliable and parseable. Unstructured prompts produced inconsistent results.

**OAuth token refresh needs to be transparent.** Google access tokens expire every hour. We built token refresh logic into our auth middleware so it happens silently before each request, with no disruption to the user."

---

## [SLIDE 13 — Thank You]

"To summarise — MemoryWeaver is a full-stack SPA that:
- Syncs photos from Google Drive
- Records voice memos in-browser
- Uses Gemini AI to generate photo analysis, audio transcriptions, and combined memory narratives
- Stores everything in Firestore with full CRUD support
- Runs securely on Google Cloud Run

The code is on GitHub at **github.com/shabib9-git/memory-weaver** and the live app is at **memory-weaver-1009624055497.us-west1.run.app**.

Thank you for watching. This is Mohammed Sufiyan, Group 4, CS 651 Spring 2026."

*[Stop recording]*

---

## Recording Tips

- **Total target time:** 8–12 minutes. The demo section will naturally vary.
- **Screen share:** Share the browser and slides. Use a clean browser profile.
- **Demo order:** Login → Gallery → View Result → Voice Memo → Generate Narrative → Journal → Filter → Database
- **If Gemini is slow:** Say "Gemini is processing the audio — this usually takes a few seconds" while waiting
- **Upload to YouTube:** Set visibility to **Unlisted** (not Private, not Public). Copy the URL and send it back.
