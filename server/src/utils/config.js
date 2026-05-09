import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

function loadDotEnv() {
  const dotenvPath = resolve(root, ".env");
  if (!existsSync(dotenvPath)) return;

  const lines = readFileSync(dotenvPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: (process.env.NODE_ENV || "development") === "development",

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
  },

  openweather: {
    apiKey: process.env.OPENWEATHER_API_KEY || "",
    lat: process.env.OPENWEATHER_LAT || "39.9042",
    lon: process.env.OPENWEATHER_LON || "116.4074",
  },

  feishu: {
    appId: process.env.FEISHU_APP_ID || "",
    appSecret: process.env.FEISHU_APP_SECRET || "",
  },

  netease: {
    apiBase: process.env.NETEASE_API_BASE || "http://localhost:3001",
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
  },

  fishaudio: {
    apiKey: process.env.FISHAUDIO_API_KEY || "",
    voiceId: process.env.FISHAUDIO_VOICE_ID || "default",
  },

  paths: {
    root,
    corpus: resolve(root, "src", "corpus"),
    templates: resolve(root, "src", "corpus", "templates"),
  },
};

export default config;
