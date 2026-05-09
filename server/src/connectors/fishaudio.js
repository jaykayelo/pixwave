import axios from "axios";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const BASE = "https://api.fish.audio";
const OUTPUT_DIR = resolve(config.paths.root, "..", "audio", "tts");

/**
 * Generate TTS audio from text and save to local file.
 * Returns { ok, data: { filePath, duration? } }
 */
export async function generateSpeech(text, options = {}) {
  const { apiKey, voiceId } = config.fishaudio;

  if (!apiKey || apiKey === "placeholder") {
    logger.warn("Fish Audio API key not configured");
    return { ok: false, error: "Fish Audio not configured", data: null };
  }

  const voice = options.voiceId || voiceId;

  try {
    // Fish Audio v1 TTS endpoint
    const { data } = await axios.post(
      `${BASE}/v1/tts`,
      {
        text,
        voice_id: voice,
        format: "mp3",
        normalize: true,
        speed: options.speed || 1.0,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
        timeout: 30000,
      }
    );

    // Persist audio file
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const filename = `tts_${Date.now()}.mp3`;
    const filePath = resolve(OUTPUT_DIR, filename);

    const { writeFileSync } = await import("node:fs");
    writeFileSync(filePath, Buffer.from(data));

    logger.info({ file: filename, bytes: data.byteLength }, "TTS audio generated");
    return {
      ok: true,
      data: {
        filePath,
        filename,
        size: data.byteLength,
      },
    };
  } catch (err) {
    logger.error({ error: err.message }, "Fish Audio TTS failed");
    return { ok: false, error: err.message, data: null };
  }
}

/**
 * Generate multiple speech segments sequentially.
 * Each item: { text, voiceId?, speed? }
 */
export async function generateSpeechBatch(segments) {
  const results = [];
  for (const seg of segments) {
    const result = await generateSpeech(seg.text, seg);
    results.push({ ...seg, ...result });
  }
  return { ok: true, data: results };
}

/**
 * List available voices.
 */
export async function listVoices() {
  const { apiKey } = config.fishaudio;
  if (!apiKey || apiKey === "placeholder") {
    return { ok: true, data: [], mock: true };
  }

  try {
    const { data } = await axios.get(`${BASE}/v1/voice`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 8000,
    });
    return { ok: true, data: data.items || data || [] };
  } catch (err) {
    logger.error({ error: err.message }, "Fish Audio listVoices failed");
    return { ok: false, error: err.message, data: [] };
  }
}
