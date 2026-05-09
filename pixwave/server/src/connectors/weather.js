import axios from "axios";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

const BASE = "https://api.openweathermap.org/data/3.0";

/**
 * Fetch current weather for configured coordinates.
 * Returns a unified { ok, data, error } tuple.
 */
export async function getCurrentWeather() {
  const { apiKey, lat, lon } = config.openweather;

  if (!apiKey || apiKey === "placeholder") {
    logger.warn("OpenWeather API key not configured, returning mock");
    return { ok: true, data: mockWeather(), mock: true };
  }

  try {
    const { data } = await axios.get(`${BASE}/weather`, {
      params: { lat, lon, appid: apiKey, units: "metric", lang: "zh_cn" },
      timeout: 8000,
    });
    logger.info({ temp: data.main.temp, desc: data.weather[0]?.description }, "Weather fetched");
    return {
      ok: true,
      data: {
        temperature: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0]?.description || "",
        icon: data.weather[0]?.icon || "",
        windSpeed: data.wind?.speed || 0,
        city: data.name || "",
      },
    };
  } catch (err) {
    logger.error({ error: err.message }, "OpenWeather request failed");
    return { ok: false, error: err.message, data: mockWeather() };
  }
}

function mockWeather() {
  return {
    temperature: 22,
    feelsLike: 21,
    humidity: 55,
    description: "晴",
    icon: "01d",
    windSpeed: 3.2,
    city: "Beijing",
  };
}
