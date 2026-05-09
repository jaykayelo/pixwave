import { existsSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const OUT_DIR = resolve(config.paths.root, "..", "..", "audio", "fallback");
const SAMPLE_RATE = 22050;
const DURATION_SEC = 12;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

// Different frequencies for different "tracks" so they sound distinct
const FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];

function generateSineWave(freq, durationSec) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec);
  const buf = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Mix fundamental + soft overtone for a richer tone
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.6
      + Math.sin(2 * Math.PI * freq * 2 * t) * 0.15
      + Math.sin(2 * Math.PI * freq * 3 * t) * 0.05;
    // Apply a gentle envelope (fade in/out)
    const env = Math.min(1, t / 0.3, (durationSec - t) / 0.5);
    const val = Math.max(-32768, Math.min(32767, Math.floor(sample * 28000 * env)));
    buf.writeInt16LE(val, i * 2);
  }
  return buf;
}

function buildWavHeader(dataLength) {
  const header = Buffer.alloc(44);
  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  // fmt sub-chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);       // PCM
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 28);
  header.writeUInt16LE(NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  // data sub-chunk
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

/**
 * Generate N fallback WAV files. Idempotent — skips if files already exist.
 * @param {number} count — how many tracks to generate (default 8)
 * @returns {Array<{ order: number, url: string, filename: string }>}
 */
export function ensureFallbackFiles(count = 8) {
  mkdirSync(OUT_DIR, { recursive: true });

  const existing = readdirSync(OUT_DIR).filter((f) => f.endsWith(".wav"));
  const tracks = [];

  for (let i = 0; i < Math.max(count, existing.length); i++) {
    const filename = `demo_${i + 1}.wav`;
    const filePath = resolve(OUT_DIR, filename);

    if (!existsSync(filePath)) {
      const freq = FREQUENCIES[i % FREQUENCIES.length] * (1 + Math.floor(i / FREQUENCIES.length) * 0.5);
      const samples = generateSineWave(freq, DURATION_SEC);
      const header = buildWavHeader(samples.length);
      writeFileSync(filePath, Buffer.concat([header, samples]));
      logger.info({ file: filename, freq: freq.toFixed(1) }, "Generated fallback audio");
    }

    tracks.push({
      order: i + 1,
      url: `/audio/fallback/${filename}`,
      filename,
    });
  }

  return tracks;
}
