import axios from "axios";
import logger from "../utils/logger.js";

/**
 * Kugou Music connector — search + play URL via public API.
 * No API key required.
 */

const SEARCH_URL = "https://complexsearch.kugou.com/v2/search/song";
const SONG_INFO_URL = "https://wwwapi.kugou.com/play/songinfo";
const MOBILE_SEARCH = "https://mobiles.kugou.com/api/v3/search/song";

export async function searchKugou(keyword, limit = 3) {
  try {
    // Try mobile API first (more reliable)
    const { data } = await axios.get(SEARCH_URL, {
      params: { keyword, page: 1, pagesize: limit },
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });

    const songs = data?.data?.lists || [];
    return songs.map((s) => ({
      id: s.hash || s.HASH || s.id,
      name: s.songname || s.SONGNAME || s.name,
      artist: s.singername || s.SINGERNAME || s.author_name || "",
      album: s.album_name || s.ALBUM || "",
      cover: s.imgurl || s.cover || "",
      hash: s.hash || s.HASH || s.id,
      source: "kugou",
    }));
  } catch (err) {
    logger.warn({ error: err.message, keyword }, "Kugou search failed");
    return [];
  }
}

export async function getKugouUrl(hash) {
  try {
    const { data } = await axios.get(SONG_INFO_URL, {
      params: { hash, appid: "1005", album_audio_id: "" },
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 8000,
    });

    if (data?.errcode !== 0 || !data?.data?.play_url) {
      // Fallback: try direct URL pattern
      return `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}`;
    }

    return data.data.play_url;
  } catch (err) {
    logger.warn({ error: err.message, hash }, "Kugou get URL failed");
    // Return a direct pattern URL as last resort
    return `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}`;
  }
}

export async function searchAndGetKugouUrl(keyword) {
  const songs = await searchKugou(keyword, 1);
  if (songs.length === 0) return null;

  const song = songs[0];
  const url = await getKugouUrl(song.hash);

  if (!url) return null;

  return {
    id: song.id,
    songName: song.name,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
    url,
    source: "kugou",
  };
}
