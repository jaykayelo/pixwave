import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTINE_PATH = resolve(__dirname, "..", "..", "state", "routine.json");

/**
 * Find the routine slot matching the current time.
 * @param {Date} [now] — defaults to current time
 * @returns {{ start, end, activity, vibe } | null}
 */
export function getRoutineByTime(now = new Date()) {
  const hhmm = now.getHours() * 60 + now.getMinutes();

  try {
    const routines = JSON.parse(readFileSync(ROUTINE_PATH, "utf-8"));
    for (const slot of routines) {
      const [sh, sm] = slot.start.split(":").map(Number);
      const [eh, em] = slot.end.split(":").map(Number);
      const start = sh * 60 + sm;
      let end = eh * 60 + em;

      // Handle overnight slots (e.g., 00:00-07:30)
      if (end <= start) end += 24 * 60;

      const t = hhmm < start ? hhmm + 24 * 60 : hhmm;

      if (t >= start && t < end) {
        return slot;
      }
    }
  } catch (e) {
    // fallback
  }

  return { start: "00:00", end: "23:59", activity: "日常", vibe: "轻松、随意" };
}

/**
 * Load user taste profile.
 */
export function loadTaste() {
  const tastePath = resolve(__dirname, "..", "..", "state", "taste.json");
  try {
    return JSON.parse(readFileSync(tastePath, "utf-8"));
  } catch {
    return { tags: [], vibe_description: "", favorite_artists: [], analyzedAt: null };
  }
}
