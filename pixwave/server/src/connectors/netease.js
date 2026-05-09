import axios from "axios";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const BASE = config.netease.apiBase;

/**
 * Search for songs by keyword.
 * Returns { ok, data: Song[] }
 */
export async function searchSongs(keyword, limit = 5) {
  try {
    const { data } = await axios.get(`${BASE}/search`, {
      params: { keywords: keyword, limit, type: 1 },
      timeout: 10000,
    });

    if (data.code !== 200) throw new Error(`Netease search error: ${data.code}`);

    const songs = (data.result?.songs || []).map(formatSong);
    logger.info({ keyword, count: songs.length }, "Songs searched");
    return { ok: true, data: songs };
  } catch (err) {
    logger.error({ error: err.message, keyword }, "Netease search failed");
    return { ok: false, error: err.message, data: [] };
  }
}

/**
 * Get play URL for a song by its id.
 */
export async function getSongUrl(songId) {
  try {
    const { data } = await axios.get(`${BASE}/song/url/v1`, {
      params: { id: songId, level: "standard" },
      timeout: 8000,
    });

    if (data.code !== 200) throw new Error(`Netease URL error: ${data.code}`);
    const url = data.data?.[0]?.url || "";
    return { ok: true, data: { url, songId } };
  } catch (err) {
    logger.error({ error: err.message, songId }, "Netease getSongUrl failed");
    return { ok: false, error: err.message, data: { url: "", songId } };
  }
}

/**
 * Get song detail (lyrics, cover, etc.)
 */
export async function getSongDetail(songId) {
  try {
    const { data } = await axios.get(`${BASE}/song/detail`, {
      params: { ids: String(songId) },
      timeout: 8000,
    });

    if (data.code !== 200) throw new Error(`Netease detail error: ${data.code}`);
    const song = data.songs?.[0];
    if (!song) return { ok: false, error: "Song not found", data: null };

    return {
      ok: true,
      data: {
        id: song.id,
        name: song.name,
        artist: song.ar?.map((a) => a.name).join("/") || "",
        album: song.al?.name || "",
        cover: song.al?.picUrl || "",
        duration: song.dt || 0,
      },
    };
  } catch (err) {
    logger.error({ error: err.message, songId }, "Netease getSongDetail failed");
    return { ok: false, error: err.message, data: null };
  }
}

/**
 * Get user playlists.
 */
export async function getUserPlaylists(uid) {
  try {
    const { data } = await axios.get(`${BASE}/user/playlist`, {
      params: { uid, limit: 10 },
      timeout: 8000,
    });

    if (data.code !== 200) throw new Error(`Netease playlist error: ${data.code}`);

    const playlists = (data.playlist || []).map((p) => ({
      id: p.id,
      name: p.name,
      cover: p.coverImgUrl || "",
      trackCount: p.trackCount || 0,
      creator: p.creator?.nickname || "",
    }));

    return { ok: true, data: playlists };
  } catch (err) {
    logger.error({ error: err.message, uid }, "Netease getPlaylists failed");
    return { ok: false, error: err.message, data: [] };
  }
}

/**
 * Get playlist tracks.
 */
export async function getPlaylistTracks(playlistId, limit = 20) {
  try {
    const { data } = await axios.get(`${BASE}/playlist/track/all`, {
      params: { id: playlistId, limit },
      timeout: 10000,
    });

    if (data.code !== 200) throw new Error(`Netease tracks error: ${data.code}`);

    const songs = (data.songs || []).map(formatSong);
    return { ok: true, data: songs };
  } catch (err) {
    logger.error({ error: err.message, playlistId }, "Netease getPlaylistTracks failed");
    return { ok: false, error: err.message, data: [] };
  }
}

/**
 * Resolve full playlist: search by keywords, get URLs, then get details.
 * This is the main function brain.js will call to turn Claude's
 * searchKeyword into playable tracks.
 */
export async function resolvePlaylist(trackRequests) {
  const resolved = [];

  for (const req of trackRequests) {
    const { data: candidates } = await searchSongs(req.searchKeyword, 1);
    if (candidates.length === 0) {
      logger.warn({ keyword: req.searchKeyword }, "No results for track request");
      resolved.push({ ...req, found: false, url: null, songId: null });
      continue;
    }

    const best = candidates[0];
    const { data: urlData } = await getSongUrl(best.id);

    resolved.push({
      order: req.order,
      songName: best.name,
      artist: best.artist,
      album: best.album,
      cover: best.cover,
      songId: best.id,
      url: urlData.url || null,
      found: !!urlData.url,
      reason: req.reason,
    });
  }

  return { ok: true, data: resolved };
}

// ── helpers ──────────────────────────────────────────────────

function formatSong(raw) {
  return {
    id: raw.id,
    name: raw.name,
    artist: raw.ar?.map((a) => a.name).join("/") || raw.artists?.map((a) => a.name).join("/") || "",
    album: raw.al?.name || raw.album?.name || "",
    cover: raw.al?.picUrl || raw.album?.picUrl || "",
    duration: raw.dt || raw.duration || 0,
  };
}

// Re-export for convenience
export default { searchSongs, getSongUrl, getSongDetail, getUserPlaylists, getPlaylistTracks, resolvePlaylist };
