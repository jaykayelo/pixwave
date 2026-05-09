import axios from "axios";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const BASE = "https://open.feishu.cn/open-apis";

let tenantToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain a tenant access token from Feishu.
 */
async function getTenantToken() {
  if (tenantToken && Date.now() < tokenExpiresAt - 60_000) {
    return tenantToken;
  }

  const { appId, appSecret } = config.feishu;
  if (!appId || appId === "placeholder") {
    logger.warn("Feishu not configured, token unavailable");
    return null;
  }

  try {
    const { data } = await axios.post(`${BASE}/auth/v3/tenant_access_token/internal`, {
      app_id: appId,
      app_secret: appSecret,
    }, { timeout: 8000 });

    if (data.code !== 0) throw new Error(`Feishu auth error: ${data.msg}`);
    tenantToken = data.tenant_access_token;
    tokenExpiresAt = Date.now() + data.expire * 1000;
    logger.info("Feishu tenant token refreshed");
    return tenantToken;
  } catch (err) {
    logger.error({ error: err.message }, "Feishu token request failed");
    return null;
  }
}

/**
 * Fetch today's calendar events.
 * Returns { ok, data: Event[], error? }
 */
export async function getTodayEvents() {
  const token = await getTenantToken();
  if (!token) {
    return { ok: true, data: [], mock: true, note: "Feishu not configured" };
  }

  const now = new Date();
  const startOfDay = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
  const endOfDay = startOfDay + 86400;

  try {
    const { data } = await axios.get(`${BASE}/calendar/v4/calendars/primary/events`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        start_time: String(startOfDay),
        end_time: String(endOfDay),
        page_size: 20,
      },
      timeout: 8000,
    });

    if (data.code !== 0) throw new Error(`Feishu calendar error: ${data.msg}`);

    const events = (data.data?.items || []).map((e) => ({
      id: e.event_id,
      summary: e.summary || "",
      startTime: e.start_time?.timestamp || e.start_time?.date || "",
      endTime: e.end_time?.timestamp || e.end_time?.date || "",
      location: e.location || "",
      description: e.description || "",
    }));

    logger.info({ count: events.length }, "Calendar events fetched");
    return { ok: true, data: events };
  } catch (err) {
    logger.error({ error: err.message }, "Feishu calendar request failed");
    return { ok: false, error: err.message, data: [] };
  }
}

/**
 * Build a human-readable summary of today's schedule.
 */
export async function getScheduleSummary() {
  const { ok, data: events, error } = await getTodayEvents();
  if (!ok) return { busy: false, summary: "无法获取日程", events: [] };
  if (events.length === 0) return { busy: false, summary: "今日暂无日程", events: [] };

  const now = Date.now();
  const upcoming = events.filter((e) => Number(e.startTime) * 1000 > now);
  const current = events.find(
    (e) => Number(e.startTime) * 1000 <= now && Number(e.endTime) * 1000 >= now
  );

  return {
    busy: !!current,
    currentEvent: current || null,
    upcomingEvents: upcoming.slice(0, 3),
    summary: current
      ? `正在进行: ${current.summary}`
      : upcoming.length > 0
        ? `下一个日程: ${upcoming[0].summary}`
        : "今日暂无日程",
    events,
  };
}
