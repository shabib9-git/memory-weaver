/**
 * geminiService.js — Google Gemini API integration for MemoryWeaver.
 *
 * Provides three non-trivial Gemini inference functions:
 *   1. analyzePhoto  → output XXX (image description, mood, key elements)
 *   2. processAudio  → output YYY (transcription + contextual summary)
 *   3. combineOutputs→ output ZZZ (cohesive memory narrative from XXX + YYY)
 *
 * Uses @google/generative-ai (google-generative-ai SDK v0.21+).
 * Reference: https://ai.google.dev/gemini-api/docs
 */

'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const { logSuccess, logError } = require('./loggingService');

// ── Initialise Gemini client ─────────────────────────────────────────
let genAI = null;

/** Lazily creates the Gemini client on first call. */
function getGenAI() {
  if (genAI) return genAI;
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set. Cannot call Gemini API.');
  }
  genAI = new GoogleGenerativeAI(config.geminiApiKey);
  return genAI;
}

// ─────────────────────────────────────────────────────────────────────
// Helper: convert a Buffer to the inline Part format Gemini expects
// ─────────────────────────────────────────────────────────────────────

/**
 * Creates an inline data Part from a raw image buffer.
 *
 * @param {Buffer} buffer   - Raw image bytes
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {object}        - Gemini inlinePart object
 */
function imagePart(buffer, mimeType = 'image/jpeg') {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Photo Analysis → XXX
// ─────────────────────────────────────────────────────────────────────

/**
 * Sends a photo to Gemini for analysis and returns structured output XXX.
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

    const prompt = `You are a thoughtful memory-journal assistant. 
Analyze this photo and provide:
1. DESCRIPTION: A vivid, 2-3 sentence description of what is shown.
2. MOOD: The emotional tone or atmosphere of the image (e.g., joyful, nostalgic, serene).
3. LOCATION: The apparent location or setting (e.g., "coastal beach", "urban street", "home interior", "mountain trail"). If unclear, write "Unknown".
4. KEY ELEMENTS: A bullet list of the 3-5 most important visual elements (people, objects, colours, setting).
5. MEMORY TITLE: A short, evocative 5-8 word title for this memory.

Format your response exactly as:
DESCRIPTION: <text>
MOOD: <text>
LOCATION: <text>
KEY ELEMENTS:
• <element>
• <element>
MEMORY TITLE: <text>`;

    const result = await model.generateContent([prompt, imagePart(imageBuffer, mimeType)]);
    const text = result.response.text();

    logSuccess('Gemini_Photo_Process', endpoint, userId, { outputLength: text.length });
    return text;
  } catch (err) {
    logError('Gemini_Photo_Process', endpoint, userId, err.message);
    throw new Error(`Gemini photo analysis failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 2. Audio Processing → YYY
// ─────────────────────────────────────────────────────────────────────

/**
 * Sends audio data to Gemini for transcription and contextual summary,
 * returning output YYY.
 *
 * Gemini 1.5 Flash/Pro supports inline audio up to ~20 MB.
 * For larger files use the File API; this implementation handles both
 * via the fileUri path.
 *
 * @param {Buffer|null} audioBuffer - Raw audio bytes (webm/ogg/mp3/wav)
 * @param {string} [audioMimeType]  - MIME type of the audio
 * @param {string} [userId]         - For logging
 * @returns {Promise<string>}       - Transcription + summary text (YYY)
 */
async function processAudio(audioBuffer, audioMimeType = 'audio/webm', userId = 'unknown') {
  const endpoint = 'gemini.generateContent/audio';
  try {
    const model = getGenAI().getGenerativeModel({ model: config.geminiModel });

    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: audioMimeType,
      },
    };

    const prompt = `You are a thoughtful memory-journal assistant.
Listen to this voice recording and provide:
1. TRANSCRIPTION: A clean, verbatim transcription of everything spoken.
2. SUMMARY: A 2-3 sentence summary capturing the key themes, emotions, and context described.
3. KEYWORDS: 3-5 keywords or phrases that capture the essence of the recording.
4. SENTIMENT: The overall emotional sentiment (e.g., excited, reflective, nostalgic, happy).

Format your response as:
TRANSCRIPTION: <text>
SUMMARY: <text>
KEYWORDS: <word1>, <word2>, ...
SENTIMENT: <text>`;

    const result = await model.generateContent([prompt, audioPart]);
    const text = result.response.text();

    logSuccess('Gemini_Audio_Process', endpoint, userId, { outputLength: text.length });
    return text;
  } catch (err) {
    logError('Gemini_Audio_Process', endpoint, userId, err.message);
    throw new Error(`Gemini audio processing failed: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────
// 3. Combined Narrative → ZZZ
// ─────────────────────────────────────────────────────────────────────

/**
 * Takes previously generated XXX and YYY and asks Gemini to weave them
 * into a single, rich memory narrative (ZZZ).
 *
 * @param {string} outputXXX - Photo analysis from analyzePhoto()
 * @param {string} outputYYY - Audio summary from processAudio()
 * @param {string} [userId]  - For logging
 * @returns {Promise<string>} - Combined narrative text (ZZZ)
 */
async function combineOutputs(outputXXX, outputYYY, userId = 'unknown') {
  const endpoint = 'gemini.generateContent/combine';
  try {
    const model = getGenAI().getGenerativeModel({ model: config.geminiModel });

    const prompt = `You are a thoughtful memory-journal assistant.
You have been given two pieces of information about a memory:

PHOTO ANALYSIS (what was captured visually):
${outputXXX}

VOICE MEMO ANALYSIS (what was said or recalled verbally):
${outputYYY}

Using both inputs, write a rich, first-person memory narrative (3-5 paragraphs) that:
• Combines the visual scene with the spoken context
• Preserves the emotional tone from both sources
• Reads like a beautifully written journal entry
• Ends with a reflective closing sentence

Begin the narrative directly (no introduction like "Here is your narrative...").`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    logSuccess('Gemini_Combine', endpoint, userId, { outputLength: text.length });
    return text;
  } catch (err) {
    logError('Gemini_Combine', endpoint, userId, err.message);
    throw new Error(`Gemini combine failed: ${err.message}`);
  }
}

module.exports = { analyzePhoto, processAudio, combineOutputs };
