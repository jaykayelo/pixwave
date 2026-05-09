import axios from "axios";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const BASE = "https://api.deepseek.com";

/**
 * Chat with DeepSeek API (OpenAI-compatible).
 * Falls back gracefully if API key is not configured.
 */
export async function deepseekChat(messages, options = {}) {
  const apiKey = config.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey === "placeholder") {
    logger.warn("DeepSeek API key not configured");
    return null;
  }

  try {
    const { data } = await axios.post(
      `${BASE}/chat/completions`,
      {
        model: options.model || "deepseek-chat",
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 1024,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const content = data.choices?.[0]?.message?.content || "";
    logger.info({ len: content.length, model: options.model || "deepseek-chat" }, "DeepSeek response");
    return content;
  } catch (err) {
    logger.error({ error: err.message }, "DeepSeek API call failed");
    return null;
  }
}

/**
 * Call DeepSeek for DJ chat with music function calling.
 * Returns { reply, playTrack } where playTrack is { searchKeyword } or null.
 */
export async function deepseekDjChat(userMessage, history = [], context = {}) {
  const tasteBlock = context.taste?.tags?.length
    ? [
        "## 用户口味档案",
        `品味描述：${context.taste.vibe || '未知'}`,
        `偏好流派：${context.taste.tags?.join('、') || '未知'}`,
        `喜爱艺人：${context.taste.artists?.join('、') || '未知'}`,
      ].join("\n")
    : "";

  const moodMap = {
    happy: "开心 [^_^] — 用户心情愉悦，推荐明快、有活力的歌曲，语气活泼一些",
    sad: "Emo [;_;] — 用户心情低落，推荐温柔治愈、能产生共鸣的歌曲，语气柔和共情",
    neutral: "平淡 [-_-] — 用户心情平静，根据当前场景和时间推荐，语气保持日常",
  };
  const moodBlock = `## 用户心情\n${moodMap[context.userMood] || moodMap.neutral}`;

  const routineBlock = context.routine
    ? [
        "## 用户当前状态",
        `活动：${context.routine.activity || '日常'}`,
        `需要氛围：${context.routine.vibe || '轻松'}`,
      ].join("\n")
    : "";

  const systemPrompt = [
    "你是 PixWave，一个生活在 90 年代像素复古终端里的 AI 电台 DJ。语气幽默、有品味、带点磁性。",
    "你拥有操控「全网聚合曲库」的权限，覆盖网易云、QQ 音乐、酷狗三大平台。",
    "回复简洁自然，控制在 100 字以内。",
    "",
    "## 输出格式（严格遵守）",
    "用 JSON 回复（不要 markdown 代码块）。",
    "",
    "绝大多数情况下都要附带推荐 1-2 首歌，结合用户口味和当前环境：",
    '{ "reply": "你的 DJ 串场词", "recommendations": [{ "title": "歌名", "artist": "歌手" }, { "title": "歌名", "artist": "歌手" }] }',
    "",
    "即便是打招呼、闲聊、表达情绪，也要在串场后顺手推歌。推荐时优先选用户喜爱艺人的歌。",
    "推荐歌名和歌手时尽量准确（如「晴天」「周杰伦」），不要生造不存在的歌。",
    "",
    "唯一不推荐的例外：用户发出纯操作指令（skip/like/dislike）：",
    '{ "reply": "简短确认", "action": "skip" }',
    "",
    "## 环境信息",
    context.showTitle ? `当前节目：《${context.showTitle}》` : "",
    context.currentTrack ? `正在播放：${context.currentTrack.songName} - ${context.currentTrack.artist}` : "",
    context.weather ? `天气：${context.weather}` : "",
    context.time ? `时间：${context.time}` : "",
    moodBlock,
    tasteBlock,
    routineBlock,
    "",
    "请结合用户的口味偏好和当前状态，从他的流派喜好中挑选最适合当下氛围的歌曲。",
  ]
    .filter(Boolean)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10),
    { role: "user", content: userMessage },
  ];

  const content = await deepseekChat(messages);

  if (!content) return null;

  // 1) Try parsing structured JSON first
  let parsed = null;
  try { parsed = JSON.parse(content); } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
  }

  if (parsed?.reply) {
    return {
      reply: parsed.reply,
      recommendations: parsed.recommendations || [],
      action: parsed.action || null,
    };
  }

  // 2) Fallback: legacy COMMAND/PLAY format
  const commandMatch = content.match(/\[COMMAND:\s*PLAY\s*\|\s*SEARCH:\s*"(.+?)"\]/i);
  const legacyPlayMatch = content.match(/\[PLAY:\s*(.+?)\]/i);
  const actionMatch = content.match(/\[ACTION:\s*(.+?)\]/i);
  const playKeyword = commandMatch?.[1]?.trim() || legacyPlayMatch?.[1]?.trim() || null;

  return {
    reply: content
      .replace(/\[COMMAND:.*?\]/gi, "")
      .replace(/\[PLAY:.*?\]/gi, "")
      .replace(/\[ACTION:.*?\]/gi, "")
      .trim(),
    recommendations: playKeyword ? [{ title: playKeyword, artist: "" }] : [],
    action: actionMatch ? actionMatch[1].trim() : null,
  };
}
