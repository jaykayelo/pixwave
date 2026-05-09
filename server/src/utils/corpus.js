import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import config from "./config.js";
import logger from "./logger.js";

const corpusDir = config.paths.corpus;

function readMarkdown(filename) {
  const filePath = resolve(corpusDir, filename);
  if (!existsSync(filePath)) {
    logger.warn({ file: filePath }, "Markdown file not found");
    return "";
  }
  return readFileSync(filePath, "utf-8");
}

function readJson(filename) {
  const filePath = resolve(corpusDir, filename);
  if (!existsSync(filePath)) {
    logger.warn({ file: filePath }, "JSON file not found, returning default");
    return {};
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    logger.error({ file: filePath, error: err.message }, "Failed to parse JSON corpus file");
    return {};
  }
}

function writeJson(filename, data) {
  const filePath = resolve(corpusDir, filename);
  mkdirSync(corpusDir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  logger.info({ file: filename }, "Corpus file updated");
}

function loadAllCorpus() {
  logger.info("Loading user corpus...");
  return {
    profile: readMarkdown("profile.md"),
    preferences: readJson("preferences.json"),
    history: readJson("history.json"),
    systemPrompt: readMarkdown("templates/system-prompt.md"),
  };
}

export { readMarkdown, readJson, writeJson, loadAllCorpus };
