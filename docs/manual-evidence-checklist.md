# Manual Evidence Collection Checklist — MemoryWeaver

This checklist tells you exactly what screenshots and links you need to collect **after deploying** to satisfy the wiki and submission requirements.

---

## Wiki Page: Intro

- [ ] **[ADD DEPLOYED URL HERE]** — Cloud Run URL, e.g. `https://memory-weaver-abc123-uc.a.run.app`
- [ ] Screenshot of the deployed login page (Screen 1)

## Project 1 Linking (Required by assignment)

- [ ] Add launch button to your Project 1 HTML (see `docs/project1-linking.md`)
- [ ] Replace `#` with your P1 URL in `LoginPage.jsx` footer
- [ ] Screenshot of Project 1 page showing the "Launch MemoryWeaver" button
- [ ] Screenshot of MemoryWeaver login page after clicking the button from P1

## Wiki Page: Description

- [ ] Screenshot of GitHub commit history (GitHub repo → Commits tab)
- [ ] Screenshot 1 of issue board (early, few issues open)
- [ ] Screenshot 2 of issue board (mid-development)
- [ ] Screenshot 3 of issue board (more closed)
- [ ] Screenshot 4 of issue board (nearing complete)
- [ ] Screenshot 5 of issue board (final, all closed or in review)

## Wiki Page: Demonstration of Application Working

### Multi-user demonstration
- [ ] Screenshot of Screen 2 (Gallery) logged in as **User 1** (you)
- [ ] Screenshot of Screen 2 (Gallery) logged in as **User 2** (teammate)
- [ ] Screenshot of a processed photo result for User 1
- [ ] Screenshot of a processed photo result for User 2

### New image demonstration
- [ ] Add a new photo to your Google Photos account
- [ ] Screenshot of Gallery **before** sync (old photo count)
- [ ] Screenshot after **Sync Photos** showing the new photo appears
- [ ] Screenshot after clicking **Process** on the new photo
- [ ] Screenshot of the resulting XXX output in Photo Results page

### Audio demonstration
- [ ] Screenshot of Screen 3 (Voice Recording) mid-recording (waveform visible)
- [ ] Screenshot of the YYY output after Gemini processes the audio
- [ ] Screenshot of ZZZ narrative (if combined)

### Firestore data
- [ ] Screenshot of Google Cloud Console → Firestore → `photoResults` collection
- [ ] Screenshot of a specific photoResult document expanded
- [ ] Screenshot of `audioResults` collection
- [ ] Screenshot of `combinedResults` collection (if populated)
- [ ] Screenshot of Screen 6 (Database View) in the app

### Gemini API calls evidence
- [ ] Screenshot of server logs showing `Gemini_Photo_Process` log entries
- [ ] Screenshot of server logs showing `Gemini_Audio_Process` log entries
- [ ] Screenshot of Cloud Logging (if deployed) with Gemini action entries

## Wiki Page: Google Database

- [ ] Screenshot of Firestore → **Native mode** database home
- [ ] Screenshot of `photoResults` collection with multiple documents
- [ ] Screenshot of a single document showing all fields (userId, photoUrl, outputXXX, processedAt)
- [ ] Description of how data is added (write the text, it's in the code)
- [ ] Description of how data is read (journal query)
- [ ] Description of how data is deleted (DELETE /api/journal/photo/:id)

## Wiki Page: Analytics+Logging

- [ ] Screenshot of GA4 dashboard showing page views
- [ ] Screenshot of GA4 → Events showing custom events (Photos_Sync, Gemini_Photo_Process, etc.)
- [ ] Screenshot of GA4 → DebugView showing real-time events during a session
- [ ] Screenshot of Cloud Logging → Log Explorer showing structured entries
- [ ] Write a 2-3 paragraph comparison of GA4 vs Cloud Logging (see template in wiki page)

## Wiki Page: Presentation

- [ ] Create slide deck using the CS651 YouTube Slides template
- [ ] Record a presentation video (must be 100% complete — 0 points otherwise)
- [ ] Upload to YouTube as **unlisted** (not private)
- [ ] **[ADD YOUTUBE URL HERE]**
- [ ] Export slide deck as **Presentation.pdf**
- [ ] Upload Presentation.pdf to GitHub
- [ ] Upload Presentation.mp4 to GitHub

## Canvas Submission

- [ ] GitHub repository URL
- [ ] Deployed application URL (Cloud Run)
- [ ] All wiki pages complete
- [ ] All issues created and closed/updated
- [ ] YouTube video URL (unlisted)
- [ ] Presentation.pdf submitted to Canvas Projects

---

## Quick Reference — What Evidence Goes Where

| Evidence | Wiki Page | Required |
|---|---|---|
| Deployed URL | Intro | ✅ |
| Commit history screenshot | Description | ✅ |
| 5 issue board screenshots | Description | ✅ |
| 2-user demo screenshots | Demonstration | ✅ |
| New photo → new output screenshots | Demonstration | ✅ |
| Audio recording → YYY screenshots | Demonstration | ✅ |
| Firestore collection screenshots | Demonstration + Google Database | ✅ |
| Gemini API call evidence | Demonstration | ✅ |
| GA4 dashboard screenshots | Analytics+Logging | ✅ |
| Cloud Logging screenshots | Analytics+Logging | ✅ |
| YouTube video URL | Presentation | ✅ |
| Presentation PDF | Presentation | ✅ |
