import axios from "axios";
import logger from "../utils/logger.js";

/**
 * QQ Music connector — search + play URL via public API.
 * No API key required.
 */

// Search: public JSONP endpoint
const SEARCH_URL = "https://c.y.qq.com/soso/fcgi-bin/client_search_cp";

// Song URL vkey endpoint (public, no auth)
const MUSIC_URL = "https://u.y.qq.com/cgi-bin/musicu.fcg";

export async function searchQQ(keyword, limit = 3) {
  try {
    const { data } = await axios.get(SEARCH_URL, {
      params: { p: 1, n: limit, w: keyword, format: "json", platform: "yqq" },
      headers: { Referer: "https://y.qq.com" },
      timeout: 8000,
    });

    const songs = data.data?.song?.list || [];
    return songs.map((s) => ({
      id: s.songmid || s.songid,
      name: s.songname || s.name,
      artist: (s.singer || []).map((si) => si.name).join("/"),
      album: s.albumname || s.album?.name || "",
      cover: `https://y.qq.com/music/photo_new/T002R300x300M000${s.albummid || s.album?.mid}.jpg`,
      source: "qq",
    }));
  } catch (err) {
    logger.warn({ error: err.message, keyword }, "QQ Music search failed");
    return [];
  }
}

export async function getQQUrl(songMid) {
  try {
    const payload = {
      req_1: {
        module: "vkey.GetVkeyServer",
        method: "CgiGetVkey",
        param: {
          guid: String(Date.now()),
          songmid: [songMid],
          songtype: [0],
          uin: "0",
          loginflag: 1,
          platform: "20",
        },
      },
    };

    const { data } = await axios.post(MUSIC_URL, payload, {
      headers: { Referer: "https://y.qq.com" },
      timeout: 8000,
    });

    const mids = data.req_1?.data?.midurlinfo || [];
    const sip = data.req_1?.data?.sip || [];
    const server = sip[0] || "";

    if (mids.length > 0 && mids[0].purl) {
      return server + mids[0].purl;
    }
    return null;
  } catch (err) {
    logger.warn({ error: err.message, songMid }, "QQ Music get URL failed");
    return null;
  }
}

export async function searchAndGetQQUrl(keyword) {
  const songs = await searchQQ(keyword, 1);
  if (songs.length === 0) return null;

  const song = songs[0];
  const url = await getQQUrl(song.id);

  if (!url) return null;

  return {
    id: song.id,
    songName: song.name,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
    url,
    source: "qq",
  };
}
