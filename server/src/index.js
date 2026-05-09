import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import axios from "axios";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import config from "./utils/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
import logger from "./utils/logger.js";
import { loadAllCorpus } from "./utils/corpus.js";
import {
  getCurrentWeather,
  getScheduleSummary,
  searchSongs,
  getSongUrl,
  getPlaylistTracks,
  generateSpeech,
  listVoices,
  resolvePlaylist,
  generateSpeechBatch,
} from "./connectors/index.js";
import { resolveTracks } from "./connectors/audioResolver.js";
import { ensureFallbackFiles } from "./connectors/fallback.js";
import { searchAcrossAll, searchAllPlatforms } from "./connectors/musicSearch.js";
import { generateShow, chat } from "./core/brain.js";
import { deepseekChat } from "./connectors/deepseek.js";
import { loadTaste, getRoutineByTime } from "./utils/routine.js";
import { assembleContext } from "./core/context.js";
import { initScheduler, triggerGenerate, getCurrentShow, getShowHistory } from "./core/scheduler.js";
import { broadcast, handleConnection, getClientCount } from "./core/ws.js";

const app = express();
app.use(express.json());

const server = createServer(app);

// ── WebSocket ─────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", handleConnection);

// ── Health Check ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    version: "0.2.0",
    wsClients: getClientCount(),
  });
});

// ── Corpus ────────────────────────────────────────────────────
app.get("/api/corpus", (_req, res) => {
  try {
    const corpus = loadAllCorpus();
    res.json({
      profile: corpus.profile.substring(0, 200) + "...",
      preferences: corpus.preferences,
      systemPromptPreview: corpus.systemPrompt.substring(0, 200) + "...",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Connector: Weather ────────────────────────────────────────
app.get("/api/connectors/weather", async (_req, res) => {
  const result = await getCurrentWeather();
  res.json(result);
});

// ── Connector: Feishu ─────────────────────────────────────────
app.get("/api/connectors/feishu", async (_req, res) => {
  const result = await getScheduleSummary();
  res.json(result);
});

// ── Connector: Netease ────────────────────────────────────────
app.get("/api/connectors/netease/search", async (req, res) => {
  const keyword = req.query.q || "晴天";
  const result = await searchSongs(keyword, 5);
  res.json(result);
});

app.get("/api/connectors/netease/url/:songId", async (req, res) => {
  const result = await getSongUrl(req.params.songId);
  res.json(result);
});

app.get("/api/connectors/netease/playlist/:id", async (req, res) => {
  const result = await getPlaylistTracks(req.params.id, 5);
  res.json(result);
});

// ── Connector: Fish Audio ─────────────────────────────────────
app.get("/api/connectors/fishaudio/voices", async (_req, res) => {
  const result = await listVoices();
  res.json(result);
});

app.post("/api/connectors/fishaudio/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });
  const result = await generateSpeech(text);
  res.json(result);
});

// ── Connector Status ──────────────────────────────────────────
app.get("/api/connectors", (_req, res) => {
  res.json({
    weather: { configured: config.openweather.apiKey !== "placeholder" && !!config.openweather.apiKey },
    feishu: { configured: config.feishu.appId !== "placeholder" && !!config.feishu.appId },
    netease: { baseUrl: config.netease.apiBase },
    fishaudio: { configured: config.fishaudio.apiKey !== "placeholder" && !!config.fishaudio.apiKey },
  });
});

// ── Show Cover Art ────────────────────────────────────────────
app.get("/api/art/:songId", async (req, res) => {
  const { data } = await getSongUrl(req.params.songId);
  // Return cover URL as JSON (frontend loads it)
  res.json(data);
});

// ── Taste Analysis ────────────────────────────────────────────
app.post("/api/analyze-taste", async (req, res) => {
  try {
    const { playlistUrl } = req.body;
    if (!playlistUrl) return res.status(400).json({ ok: false, error: "需要 playlistUrl" });

    // Extract playlist ID from Netease URL
    const match = playlistUrl.match(/playlist[\/\?].*?(\d{5,})/);
    if (!match) return res.status(400).json({ ok: false, error: "无效的歌单链接" });

    const playlistId = match[1];
    logger.info({ playlistId }, "Analyzing playlist taste");

    // Fetch ALL tracks with pagination
    const allTracks = [];
    const perPage = 500;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const { data } = await axios.get(`http://localhost:3001/playlist/track/all`, {
        params: { id: playlistId, limit: perPage, offset },
      });
      if (data.code !== 200) throw new Error(`Netease error: ${data.code}`);

      const songs = data.songs || [];
      allTracks.push(...songs.map((s) =>
        `${s.name} - ${s.ar?.map((a) => a.name).join("/") || s.artists?.map((a) => a.name).join("/")}`
      ));

      total = data.total || data.songCount || 0;
      offset += perPage;
      logger.info({ fetched: allTracks.length, total }, "Fetching playlist tracks...");
    }

    if (allTracks.length === 0) return res.status(400).json({ ok: false, error: "歌单为空" });
    const tracks = allTracks;
    logger.info({ trackCount: tracks.length }, "All playlist tracks fetched");

    // Ask DeepSeek to analyze
    const analysisPrompt = [
      "# 任务设定",
      "你是一个专业的音乐心理分析师。我会给你一份用户最常听的歌曲列表。",
      "请深度分析这位用户的音乐品味、潜在情绪和审美偏好。",
      "",
      "## 歌曲列表",
      tracks.map((t, i) => `${i + 1}. ${t}`).join("\n"),
      "",
      "# 输出要求",
      "请严格返回以下 JSON 格式（不要包含 markdown 代码块标记）：",
      '{',
      '  "tags": ["迷幻摇滚", "合成器波", "放松", "华语流行"],',
      '  "vibe_description": "一段不超过 50 字的描述",',
      '  "favorite_artists": ["艺人1", "艺人2"]',
      '}',
    ].join("\n");

    const reply = await deepseekChat([
      { role: "system", content: "你是一个专业的音乐心理分析师。请严格返回 JSON。" },
      { role: "user", content: analysisPrompt },
    ], { temperature: 0.5, maxTokens: 4096 });

    if (!reply) throw new Error("DeepSeek analysis failed");

    // Parse the JSON from DeepSeek reply
    let parsed;
    try { parsed = JSON.parse(reply); } catch {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("无法解析分析结果");
    }

    // Save to state/taste.json
    const tastePath = resolve(__dirname, "..", "state", "taste.json");
    const taste = {
      tags: parsed.tags || [],
      vibe_description: parsed.vibe_description || "",
      favorite_artists: parsed.favorite_artists || [],
      analyzedAt: new Date().toISOString(),
      trackCount: tracks.length,
    };
    writeFileSync(tastePath, JSON.stringify(taste, null, 2), "utf-8");

    logger.info({ tags: taste.tags, artists: taste.favorite_artists }, "Taste analysis saved");
    res.json({ ok: true, data: taste });
  } catch (err) {
    logger.error({ error: err.message }, "Taste analysis failed");
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Taste Profile ─────────────────────────────────────────────
app.get("/api/taste", (_req, res) => {
  const taste = loadTaste();
  const routine = getRoutineByTime();
  res.json({ ok: true, data: { taste, currentRoutine: routine } });
});

// ── Shows API ─────────────────────────────────────────────────
app.post("/api/shows/generate", async (req, res) => {
  try {
    const label = req.body.label || "手动触发";
    logger.info({ label }, "Manual show generation requested");
    const result = await triggerGenerate(label);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/shows/current", (_req, res) => {
  const show = getCurrentShow();
  if (!show) {
    return res.json({ ok: true, data: null, note: "No show generated yet" });
  }
  res.json({ ok: true, data: show });
});

app.get("/api/shows/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = getShowHistory(limit);
  res.json({ ok: true, data: history, count: history.length });
});

app.post("/api/brain/generate", async (req, res) => {
  try {
    const ctx = req.body.context || buildMockContext();
    const result = await generateShow(ctx);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Chat API ───────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, mood } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ ok: false, error: "消息不能为空" });
    }

    const currentShow = getCurrentShow();
    const currentTrack = currentShow?.playlist?.find(
      (t) => t.type === "song"
    ) || null;

    // Assemble environment context for AI
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 6 ? "深夜" : hour < 9 ? "清晨" : hour < 12 ? "上午" : hour < 14 ? "午间" : hour < 18 ? "下午" : "晚间";

    try {
      var { data: weatherData } = await getCurrentWeather();
    } catch { var weatherData = null; }

    const taste = loadTaste();
    const routine = getRoutineByTime();

    const aiContext = {
      showTitle: currentShow?.showTitle || null,
      currentTrack: currentTrack
        ? { songName: currentTrack.songName, artist: currentTrack.artist }
        : null,
      userMood: mood || "neutral",
      weather: weatherData?.description ? `${weatherData.description} ${weatherData.temperature}°` : null,
      time: `${timeOfDay} ${now.toLocaleString("zh-CN")}`,
      taste: {
        tags: taste.tags || [],
        vibe: taste.vibe_description || "",
        artists: taste.favorite_artists || [],
      },
      routine: {
        activity: routine.activity || "日常",
        vibe: routine.vibe || "轻松",
      },
    };

    const result = await chat(message.trim(), history || [], aiContext);

    // Resolve recommendations — search ALL platforms per recommendation
    if (result.ok && result.data.recommendations?.length > 0) {
      const allAttachments = [];
      let firstPlayable = null;

      for (const rec of result.data.recommendations) {
        const keyword = rec.artist ? `${rec.artist} ${rec.title}` : rec.title;

        // Search all 3 platforms in parallel, collect all hits
        const hits = await searchAllPlatforms(keyword);

        if (hits.length > 0) {
          for (const hit of hits) {
            const att = {
              type: "song",
              songName: hit.songName || rec.title,
              artist: hit.artist || rec.artist,
              url: hit.url,
              cover: hit.cover,
              source: hit.source,
            };
            allAttachments.push(att);
            if (!firstPlayable) firstPlayable = att;
          }
        } else {
          // No platform found this song — still show it as unavailable
          allAttachments.push({
            type: "song",
            songName: rec.title,
            artist: rec.artist,
            url: null,
            source: "none",
          });
        }
      }

      // Deduplicate: same songName+artist from different platforms → keep first
      const seen = new Set();
      result.data.attachments = allAttachments.filter((a) => {
        const key = `${(a.songName || "").trim()}||${(a.artist || "").trim()}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (firstPlayable) {
        result.data.resolvedTrack = firstPlayable;
        logger.info({ total: allAttachments.length, sources: allAttachments.map(a => a.source).join(',') }, "Recommendations resolved");
      }
    }

    if (result.ok && result.data.action) {
      handleChatAction(result.data.action);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function handleChatAction(action) {
  logger.info({ action }, "Chat action triggered");
  switch (action) {
    case "skip":
      broadcast("chat_action", { action: "skip" });
      break;
    case "regenerate":
      triggerGenerate("聊天请求").then((r) => {
        if (r.ok) broadcast("show_generated", r.data);
      });
      break;
    case "like":
      broadcast("chat_action", { action: "like" });
      break;
    case "dislike":
      broadcast("chat_action", { action: "dislike" });
      break;
    default:
      if (action.startsWith("search:")) {
        const style = action.replace("search:", "");
        triggerGenerate(`搜索: ${style}`).then((r) => {
          if (r.ok) broadcast("show_generated", r.data);
        });
      }
  }
}

// ── Static audio files (TTS + Fallback) ────────────────────────
const ttsDir = resolve(__dirname, "..", "..", "audio", "tts");
const fallbackDir = resolve(__dirname, "..", "..", "audio", "fallback");
app.use("/audio/tts", express.static(ttsDir));
app.use("/audio/fallback", express.static(fallbackDir));

// ── Mock Context Builder ──────────────────────────────────────
function buildMockContext() {
  const now = new Date();
  const hour = now.getHours();
  return {
    now: now.toISOString(),
    timeOfDay: hour < 6 ? "深夜" : hour < 12 ? "上午" : hour < 14 ? "午间" : hour < 18 ? "下午" : "晚间",
    dayOfWeek: ["日", "一", "二", "三", "四", "五", "六"][now.getDay()],
    weather: { temperature: 22, feelsLike: 21, humidity: 55, description: "晴", city: "北京" },
    schedule: { busy: false, summary: "今日暂无日程" },
    preferences: { songsPerShow: 8, tasteRules: { excludeGenres: ["重金属", "土嗨", "喊麦"], preferLanguage: ["zh", "en"] } },
    recentHistory: [],
  };
}

// ── Full Pipeline ─────────────────────────────────────────────
async function pipeline() {
  // Stage 1: Assemble context
  broadcast("pipeline_stage", { stage: "context", status: "started" });
  const ctx = await assembleContext();
  broadcast("pipeline_stage", { stage: "context", status: "done" });

  // Stage 2: Generate show via Claude
  broadcast("pipeline_stage", { stage: "brain", status: "started" });
  const result = await generateShow(ctx);
  if (!result.ok) {
    broadcast("pipeline_stage", { stage: "brain", status: "failed", error: result.error });
    return result;
  }
  broadcast("pipeline_stage", { stage: "brain", status: "done" });

  const show = result.data;

  // Stage 3: Resolve playlist (searchKeywords → playable URLs, fallback if needed)
  broadcast("pipeline_stage", { stage: "resolve", status: "started" });
  const resolved = await resolveTracks(show.playlist || [], {
    fallbackTracks: ensureFallbackFiles(show.playlist?.length || 8),
  });
  const resolvedTracks = resolved.data || [];
  broadcast("pipeline_stage", {
    stage: "resolve",
    status: "done",
    trackCount: resolvedTracks.length,
    fallbackCount: resolved.fallbackUsed || 0,
  });

  // Stage 4: Generate TTS for DJ scripts
  broadcast("pipeline_stage", { stage: "tts", status: "started" });
  let ttsResults = [];
  if (show.djScripts?.length > 0) {
    try {
      const ttsResult = await generateSpeechBatch(
        show.djScripts.map((s) => ({ text: s.text, meta: { beforeTrack: s.beforeTrack } }))
      );
      if (ttsResult.ok) ttsResults = ttsResult.data;
    } catch (err) {
      logger.warn({ error: err.message }, "TTS generation failed, continuing without TTS");
    }
  }
  broadcast("pipeline_stage", { stage: "tts", status: "done", ttsCount: ttsResults.length });

  // Stage 5: Merge TTS into playlist (interleave based on beforeTrack)
  const mergedPlaylist = mergePlaylist(resolvedTracks, ttsResults, show.djScripts || []);

  return {
    ok: true,
    data: {
      showTitle: show.showTitle,
      mood: show.mood,
      reason: show.reason,
      playlist: mergedPlaylist,
      djScripts: show.djScripts || [],
    },
  };
}

/**
 * Interleave TTS audio items into the track playlist based on djScript beforeTrack.
 *
 * Merged item types:
 *   { type: "tts", audioUrl, text, beforeTrack }
 *   { type: "song", order, songName, artist, url, cover, reason, ... }
 */
function mergePlaylist(tracks, ttsResults, djScripts) {
  // Build a map: beforeTrack → tts item
  const ttsMap = new Map();
  for (let i = 0; i < ttsResults.length; i++) {
    const tts = ttsResults[i];
    const script = djScripts[i];
    const beforeTrack = script?.beforeTrack || 0;
    if (!ttsMap.has(beforeTrack)) ttsMap.set(beforeTrack, []);
    ttsMap.get(beforeTrack).push({
      type: "tts",
      audioUrl: tts.data?.filePath
        ? `/audio/tts/${tts.data.filename}`
        : null,
      text: tts.text || script?.text || "",
      beforeTrack,
    });
  }

  // Interleave
  const merged = [];
  for (const track of tracks) {
    const order = track.order || merged.length + 1;
    // Insert any TTS items before this track
    const ttss = ttsMap.get(order) || [];
    for (const t of ttss) merged.push(t);
    merged.push({ type: "song", ...track, order });
  }

  return merged;
}

// ── Show Generated Handler (WS broadcast) ─────────────────────
function onShowGenerated(show) {
  broadcast("show_generated", {
    id: show.id,
    showTitle: show.showTitle,
    mood: show.mood,
    trackCount: show.playlist?.length || 0,
    playlist: show.playlist,
  });
}

// ── Startup ───────────────────────────────────────────────────
server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "PixWave server started (HTTP + WS)");

  try {
    const corpus = loadAllCorpus();
    logger.info(
      { hasProfile: !!corpus.profile, hasPreferences: !!corpus.preferences, hasSystemPrompt: !!corpus.systemPrompt },
      "Corpus loaded"
    );
  } catch (err) {
    logger.error({ error: err.message }, "Corpus load failed");
  }

  // Pre-generate fallback audio files
  const fallbackCount = ensureFallbackFiles(8).length;
  logger.info({ count: fallbackCount }, "Fallback audio ready");

  initScheduler(pipeline, onShowGenerated);
});

export default app;
