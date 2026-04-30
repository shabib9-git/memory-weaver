# Testing Checklist — MemoryWeaver

Test in Chrome, Safari, and Firefox (as required by the assignment).

---

## Authentication

- [ ] Login page displays correctly on first visit
- [ ] "Sign in with Google" button redirects to Google OAuth
- [ ] OAuth consent screen shows correct app name and scopes
- [ ] After consent, user is redirected to `/gallery`
- [ ] User avatar, name displayed in Navbar
- [ ] "Sign out" clears session and returns to `/`
- [ ] Navigating to protected route while logged out redirects to `/`
- [ ] Session persists on page refresh (server-side session cookie)

## Photo Gallery (Screen 2)

- [ ] Gallery loads user's Google Photos
- [ ] "Processed" badge shows for already-analysed photos
- [ ] "New" photos show "Process" button
- [ ] "Sync Photos" button refreshes the list
- [ ] Single photo "Process" button calls Gemini and saves to Firestore
- [ ] After processing, badge changes to "Analysed"
- [ ] "Process All New" sends all unprocessed photos
- [ ] "Add Voice Memo" navigates to `/record` with photo context
- [ ] "View Result" navigates to `/results/:photoId` with photo context
- [ ] Pagination works (Load More Photos button)
- [ ] Error state shows friendly message if Google Photos API fails

## Voice Recording (Screen 3)

- [ ] Microphone permission prompt appears on first use
- [ ] Recording timer counts up during recording
- [ ] Waveform animation shows audio levels
- [ ] Stop button ends recording; audio player appears
- [ ] Recorded audio plays back correctly
- [ ] "Process with Gemini" uploads audio and shows YYY result
- [ ] Upload progress percentage shows during upload
- [ ] YYY output shows transcription, summary, keywords, sentiment
- [ ] "Generate Narrative" combines XXX + YYY → ZZZ (requires linked photo)
- [ ] ZZZ narrative displays and saves to Firestore
- [ ] "Record Again" resets the recorder
- [ ] Error message if microphone access is denied
- [ ] "Back to Gallery" button works

## Photo Results (Screen 4)

- [ ] Photo image loads at good resolution
- [ ] Gemini XXX output shows structured sections: Description, Mood, Key Elements, Memory Title
- [ ] "Re-analyse" triggers a new Gemini API call
- [ ] "Add Voice Memo" navigates to recording screen with photo pre-linked
- [ ] "View in Journal" navigates to journal

## Journal / Timeline (Screen 5)

- [ ] All journal entries load from Firestore
- [ ] Entries sorted by processedAt descending (newest first)
- [ ] Photo thumbnail visible in each entry
- [ ] Expanding entry shows XXX, YYY, ZZZ text
- [ ] Filter tabs (All / Photos / Audio / Narratives) work correctly
- [ ] Search filters entries by text content
- [ ] "Delete" removes entry from Firestore and UI
- [ ] Empty state message shown when no entries exist
- [ ] Audio player renders for entries with audio

## Database View (Screen 6)

- [ ] Service health panel shows configuration status
- [ ] Three collection tabs (photoResults, audioResults, combinedResults) visible
- [ ] Document count shown per collection
- [ ] Expanding a document shows raw JSON (truncated fields)
- [ ] Schema section shows field names and types
- [ ] Firestore query examples are displayed
- [ ] "NOT CONFIGURED" status shown for unconfigured services

## Cross-browser

- [ ] Chrome — all features work
- [ ] Safari — OAuth and recording work (note: MediaRecorder support varies)
- [ ] Firefox — all features work

## Error Handling

- [ ] Invalid/expired Gemini API key → friendly error shown
- [ ] Google Photos token expired → 401 handled, user informed
- [ ] Network error → error banner shown, no crash
- [ ] Firestore not configured → app still runs with warning
- [ ] Missing microphone → clear error in AudioRecorder

## Analytics

- [ ] GA4 initialises (check browser DevTools → Network → gtag requests)
- [ ] Page views fire on route changes
- [ ] "Login" event fires after Google OAuth success
- [ ] "Photos Sync" event fires when photos load
- [ ] "Record Stop" event fires after recording
- [ ] "Gemini Audio Process" event fires after audio processing
- [ ] Events visible in GA4 → DebugView

## Logging

- [ ] Server console shows structured log entries for each API call
- [ ] Production: Cloud Logging → Log Explorer shows entries
- [ ] All log entries include: action, endpoint, success, userId, timestamp
