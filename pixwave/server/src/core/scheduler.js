import cron from "node-cron";
import { readJson, writeJson } from "../utils/corpus.js";
import logger from "../utils/logger.js";

let pipeline = null;    // async () => { ok, data: show }
let currentShow = null;
let showHistory = [];
let cronJobs = [];
let onShowCallback = null;   // (show) => void — called after each show is persisted

/**
 * Initialize the scheduler.
 * @param {function} generateFn — async pipeline function that produces a show
 * @param {function} [onShow] — optional callback when a show is generated
 */
export function initScheduler(generateFn, onShow) {
  pipeline = generateFn;
  if (onShow) onShowCallback = onShow;

  // Load existing history
  const stored = readJson("history.json");
  showHistory = stored.shows || [];
  if (stored.currentShow) {
    currentShow = stored.currentShow;
  }

  // Load schedule from preferences
  const prefs = readJson("preferences.json");
  const schedules = prefs.schedule?.autoGenerate || [];

  if (schedules.length === 0) {
    logger.info("No auto-generate schedules configured");
  }

  for (const entry of schedules) {
    if (!cron.validate(entry.cron)) {
      logger.warn({ label: entry.label, cron: entry.cron }, "Invalid cron expression, skipping");
      continue;
    }

    const job = cron.schedule(entry.cron, async () => {
      logger.info({ label: entry.label, cron: entry.cron }, "Scheduled trigger fired");
      await runPipeline(entry.label);
    }, { timezone: prefs.schedule?.timezone || "Asia/Shanghai" });

    cronJobs.push(job);
    logger.info({ label: entry.label, cron: entry.cron }, "Cron job registered");
  }

  logger.info({ jobCount: cronJobs.length }, "Scheduler initialized");
}

/**
 * Manually trigger show generation.
 * @param {string} [label="手动触发"]
 * @returns {object} { ok, data: show }
 */
export async function triggerGenerate(label = "手动触发") {
  return runPipeline(label);
}

/**
 * Get the current/latest show.
 */
export function getCurrentShow() {
  return currentShow;
}

/**
 * Get show history.
 */
export function getShowHistory(limit = 10) {
  return showHistory.slice(-limit).reverse();
}

/**
 * Save show state to disk.
 */
function persistState() {
  writeJson("history.json", {
    currentShow,
    shows: showHistory.slice(-50),   // keep last 50
    listened: readJson("history.json").listened || [],
    liked: readJson("history.json").liked || [],
    skipped: readJson("history.json").skipped || [],
  });
}

/**
 * Run the full generation pipeline.
 */
async function runPipeline(label) {
  if (!pipeline) {
    logger.error("Pipeline not initialized");
    return { ok: false, error: "Scheduler not initialized" };
  }

  logger.info({ label }, "Starting show generation pipeline");

  try {
    const result = await pipeline();

    if (!result.ok) {
      logger.error({ error: result.error, label }, "Pipeline failed");
      return result;
    }

    // Record metadata
    const show = {
      ...result.data,
      generatedAt: new Date().toISOString(),
      triggerLabel: label,
      id: `show_${Date.now()}`,
    };

    currentShow = show;
    showHistory.push(show);
    persistState();

    logger.info({ id: show.id, title: show.showTitle, tracks: show.playlist?.length }, "Show saved");
    if (onShowCallback) onShowCallback(show);
    return { ok: true, data: show };
  } catch (err) {
    logger.error({ error: err.message, label }, "Pipeline crashed");
    return { ok: false, error: err.message };
  }
}
