import { getCurrentWeather } from "../connectors/weather.js";
import { getScheduleSummary } from "../connectors/feishu.js";
import { loadAllCorpus } from "../utils/corpus.js";
import { loadTaste, getRoutineByTime } from "../utils/routine.js";
import logger from "../utils/logger.js";

/**
 * Assemble the full runtime context for the AI brain.
 * Combines: weather, schedule, user corpus, taste profile, routine.
 *
 * @returns {object} runtimeContext — ready to pass to brain.js
 */
export async function assembleContext() {
  logger.info("Assembling runtime context...");

  // 1. Parallel fetch external context
  const [weatherResult, scheduleResult] = await Promise.all([
    getCurrentWeather(),
    getScheduleSummary(),
  ]);

  // 2. Load local corpus
  const corpus = loadAllCorpus();
  const preferences = corpus.preferences || {};
  const history = corpus.history || {};
  const profile = corpus.profile || "";

  // 3. Load taste + routine
  const taste = loadTaste();
  const routine = getRoutineByTime();

  // 4. Time metadata
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay =
    hour < 6 ? "深夜" : hour < 9 ? "清晨" : hour < 12 ? "上午" : hour < 14 ? "午间" : hour < 18 ? "下午" : "晚间";

  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
  const isWeekend = [0, 6].includes(now.getDay());

  // 5. Assemble
  const context = {
    // time
    now: now.toISOString(),
    timeOfDay,
    dayOfWeek: `周${dayNames[now.getDay()]}`,
    isWeekend,
    timestamp: Date.now(),

    // external
    weather: weatherResult.data || null,
    schedule: scheduleResult,

    // taste profile
    taste: {
      tags: taste.tags || [],
      vibe: taste.vibe_description || "",
      artists: taste.favorite_artists || [],
    },

    // current routine
    routine: {
      activity: routine.activity || "日常",
      vibe: routine.vibe || "轻松、随意",
      start: routine.start,
      end: routine.end,
    },

    // user corpus
    preferences: {
      songsPerShow: preferences.show?.songsPerShow || 8,
      ttsInterval: preferences.show?.ttsInterval || 3,
      maxDurationMin: preferences.show?.maxDurationMin || 45,
      tasteRules: preferences.tasteRules || {},
    },
    recentHistory: history.listened?.slice(-20) || [],
    likedSongs: history.liked || [],
    skippedSongs: history.skipped || [],
    profileExcerpt: profile.substring(0, 500),
  };

  logger.info(
    {
      timeOfDay,
      weather: context.weather?.description,
      routine: routine.activity,
      tasteTags: taste.tags,
      scheduleSummary: context.schedule?.summary,
    },
    "Context assembled"
  );

  return context;
}
