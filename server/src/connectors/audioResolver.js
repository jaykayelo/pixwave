import { resolvePlaylist } from "./netease.js";
import { ensureFallbackFiles } from "./fallback.js";
import logger from "../utils/logger.js";

/**
 * Resolve track audio URLs with graceful fallback.
 *
 * 1. Try the Netease proxy first.
 * 2. For any tracks that failed (url: null), assign a local fallback WAV.
 * 3. If the entire call fails (network error), use 100% fallback.
 *
 * @param {Array} trackRequests — from brain.js output [{ searchKeyword, order, songName, artist, reason }]
 * @param {object} options
 * @param {Array} [options.fallbackTracks] — pre-generated fallback tracks from ensureFallbackFiles()
 * @returns {{ ok: boolean, data: Array, fallbackUsed: number }}
 */
export async function resolveTracks(trackRequests, options = {}) {
  if (!trackRequests || trackRequests.length === 0) {
    return { ok: true, data: [], fallbackUsed: 0 };
  }

  const fallbackPool = options.fallbackTracks || ensureFallbackFiles(trackRequests.length);

  // Stage 1: try Netease
  let resolved = [];
  let neteaseOk = false;

  try {
    const result = await resolvePlaylist(trackRequests);
    if (result.ok && result.data) {
      resolved = result.data;
      neteaseOk = resolved.some((t) => t.url);
    }
  } catch (err) {
    logger.warn({ error: err.message }, "Netease resolution completely failed");
  }

  // Stage 2: fill gaps with fallback
  let fallbackUsed = 0;

  if (neteaseOk) {
    // Partial success — only fill the gaps
    for (let i = 0; i < resolved.length; i++) {
      if (!resolved[i].url) {
        const fb = fallbackPool[i % fallbackPool.length];
        resolved[i].url = fb.url;
        resolved[i].isFallback = true;
        resolved[i].found = false;
        fallbackUsed++;
      }
    }
  } else {
    // Complete failure — map all tracks to fallback
    resolved = trackRequests.map((req, i) => {
      const fb = fallbackPool[i % fallbackPool.length];
      return {
        order: req.order || i + 1,
        songName: req.songName || `Demo Track ${i + 1}`,
        artist: req.artist || "PixWave Demo",
        reason: req.reason || "",
        searchKeyword: req.searchKeyword || "",
        url: fb.url,
        songId: null,
        isFallback: true,
        found: false,
      };
    });
    fallbackUsed = resolved.length;
  }

  logger.info({ total: resolved.length, fallbackUsed, neteaseOk }, "Track resolution complete");
  return { ok: true, data: resolved, fallbackUsed };
}
