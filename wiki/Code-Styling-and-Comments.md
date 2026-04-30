# Code Styling and Comments — MemoryWeaver

## Naming Conventions

All code follows **camelCase** naming throughout:

| Construct | Convention | Example |
|---|---|---|
| Variables | camelCase | `outputXXX`, `photoUrl`, `nextPageToken` |
| Functions | camelCase | `analyzePhoto()`, `savePhotoResult()`, `fetchUserPhotos()` |
| React components | PascalCase | `GalleryPage`, `PhotoCard`, `AudioRecorder` |
| Constants | UPPER_SNAKE_CASE | `PREFERRED_TYPES`, `NAV_LINKS`, `MAX_BATCH` |
| Files | camelCase | `geminiService.js`, `firestoreService.js`, `authMiddleware.js` |
| CSS variables | camelCase-dashes (standard CSS) | `--color-primary`, `--font-sans` |
| Route paths | kebab-case (HTTP standard) | `/api/photos`, `/api/gemini/photo` |

## Comment Style

All files contain:

1. **File-level JSDoc header** — explains the module's purpose, endpoints it handles, and any setup notes
2. **Function-level JSDoc** — `@param` and `@returns` tags for every exported function
3. **Inline comments** — explain non-obvious logic, trade-offs, and business rules
4. **Section dividers** — `// ── Section Name ─────` pattern separates logical groups

### Example — Service Function with Full Comments

```javascript
/**
 * analyzePhoto — Sends a photo to Gemini for analysis and returns structured output XXX.
 *
 * The prompt asks for:
 *   - A vivid description of scene content
 *   - Detected mood / emotional tone
 *   - Key visual elements (people, objects, colours, setting)
 *   - A short one-line "memory title"
 *
 * @param {Buffer|string} imageSource - Raw image bytes OR a base64 string
 * @param {string} [mimeType]         - MIME type, defaults to "image/jpeg"
 * @param {string} [userId]           - For logging
 * @returns {Promise<string>}         - Gemini's analysis text (XXX)
 */
async function analyzePhoto(imageSource, mimeType = 'image/jpeg', userId = 'unknown') {
  const endpoint = 'gemini.generateContent/photo';
  try {
    const model = getGenAI().getGenerativeModel({ model: config.geminiModel });

    // Convert to Buffer if a base64 string was supplied
    const imageBuffer =
      typeof imageSource === 'string' ? Buffer.from(imageSource, 'base64') : imageSource;

    // Structured prompt ensures consistent, parseable Gemini output
    const prompt = `...`;

    const result = await model.generateContent([prompt, imagePart(imageBuffer, mimeType)]);
    const text = result.response.text();

    logSuccess('Gemini_Photo_Process', endpoint, userId, { outputLength: text.length });
    return text;
  } catch (err) {
    logError('Gemini_Photo_Process', endpoint, userId, err.message);
    throw new Error(`Gemini photo analysis failed: ${err.message}`);
  }
}
```

### Example — React Component with Comments

```jsx
/**
 * AudioRecorder.jsx — Browser-based voice recording component.
 *
 * Uses the Web MediaRecorder API to capture microphone audio as a
 * Blob (webm or ogg depending on browser support).
 *
 * Props:
 *   onRecordingComplete(blob, mimeType) — called with the recorded audio
 *   linkedPhotoUrl                      — optional photo this memo is for
 *   disabled                            — disables controls (e.g. during upload)
 */

// ── Waveform animation during recording ──────────────────────────
function startWaveformAnimation() {
  function animate() {
    if (analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      // Sample 20 evenly-spaced frequency bins for the visualisation
      const amplitudes = Array.from({ length: 20 }, (_, i) => {
        const idx = Math.floor((i / 20) * data.length);
        return data[idx] / 255;
      });
      setWaveAmplitudes(amplitudes);
    }
    animationRef.current = requestAnimationFrame(animate);
  }
  animate();
}
```

## Code Quality Standards

- **No dead code** — All functions are used; no commented-out code blocks
- **No magic numbers** — Named constants replace raw values (e.g., `MAX_BATCH = 10`)
- **Consistent async/await** — All asynchronous operations use async/await pattern
- **Graceful error handling** — try/catch in every service function; errors propagate with context
- **Single responsibility** — Each module/service handles one concern
- **Environment isolation** — All credentials in env vars; no hardcoded keys anywhere

## File Organisation

```
server/
  config/     — Configuration only (env.js)
  services/   — Business logic (no Express-specific code)
  routes/     — Express route handlers (thin layer over services)
  middleware/ — Cross-cutting concerns (auth, error handling)
  index.js    — Server setup and wiring only

client/src/
  pages/      — Screen-level components (one per route)
  components/ — Reusable UI components
  services/   — API call layer (no React state here)
  context/    — React context providers
  utils/      — Pure utility functions
```
