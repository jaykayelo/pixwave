import { resolvePlaylist } from "./netease.js";
import { searchAndGetQQUrl } from "./qqmusic.js";
import { searchAndGetKugouUrl } from "./kugou.js";
import logger from "../utils/logger.js";

/**
 * Multi-platform "race" search.
 * Fires all three platforms in parallel (Promise.allSettled).
 * Returns the first valid result with a playable URL.
 *
 * Priority order in practice:
 *   1. Netease (best atmosphere/metadata)
 *   2. QQ Music (Jay Chou etc.)
 *   3. Kugou (old songs, internet hits)
 *
 * @param {string} keyword
 * @returns {object|null} { songName, artist, url, source, ... }
 */
export async function searchAcrossAll(keyword) {
  logger.info({ keyword }, "Multi-platform search started");

  const results = await Promise.allSettled([
    searchNeteaseWrapper(keyword),
    searchAndGetQQUrl(keyword),
    searchAndGetKugouUrl(keyword),
  ]);

  const sources = ["netease", "qq", "kugou"];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.url) {
      logger.info(
        { keyword, source: sources[i], song: r.value.songName },
        "Multi-platform search hit"
      );
      return { ...r.value, source: r.value.source || sources[i] };
    }
  }

  logger.warn({ keyword }, "All platforms failed to find playable URL");
  return null;
}

/**
 * Search ALL platforms and return ALL valid results.
 * Used when we want to show the user multiple options from different sources.
 */
export async function searchAllPlatforms(keyword) {
  logger.info({ keyword }, "All-platforms search started");

  const results = await Promise.allSettled([
    searchNeteaseWrapper(keyword),
    searchAndGetQQUrl(keyword),
    searchAndGetKugouUrl(keyword),
  ]);

  const hits = [];
  const sources = ["netease", "qq", "kugou"];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.url) {
      hits.push({ ...r.value, source: r.value.source || sources[i] });
      logger.info({ keyword, source: sources[i], song: r.value.songName }, "Platform hit");
    } else {
      logger.info({ keyword, source: sources[i], status: r.status, hasUrl: !!r.value?.url }, "Platform miss");
    }
  }

  logger.info({ keyword, hits: hits.length, total: 3 }, "All-platforms search complete");
  return hits;
}

/**
 * Wrapper: Netease search → get first playable URL.
 * Uses the existing resolvePlaylist infrastructure.
 */
async function searchNeteaseWrapper(keyword) {
  try {
    const result = await resolvePlaylist([{ searchKeyword: keyword, order: 1 }]);
    if (result.ok && result.data?.[0]?.url) {
      const t = result.data[0];
      return {
        songName: t.songName,
        artist: t.artist,
        album: t.album,
        cover: t.cover,
        url: t.url,
        source: "netease",
      };
    }
    return null;
  } catch {
    return null;
  }
}
