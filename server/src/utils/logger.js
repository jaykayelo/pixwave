import pino from "pino";
import config from "./config.js";

const transport = config.isDev
  ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
  : undefined;

const logger = pino({ level: config.isDev ? "debug" : "info" }, pino.transport(transport));

export default logger;
