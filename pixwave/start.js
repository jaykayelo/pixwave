import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, "server");
const clientDir = resolve(__dirname, "client");

const colors = { green: "\x1b[32m", cyan: "\x1b[36m", magenta: "\x1b[35m", yellow: "\x1b[33m", reset: "\x1b[0m" };

function log(label, msg) {
  const c = colors[label] || "";
  console.log(`${c}[${label}]${colors.reset} ${msg}`);
}

async function checkPort(port) {
  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main ────────────────────────────────────────────────────
console.log(`${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.magenta}  PixWave — AI 音乐电台 (Node.js)${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}\n`);

// Check if already running
if (await checkPort(3000)) {
  log("WARN", "后端已在运行 (port 3000)");
} else {
  log("INFO", "启动后端...");
  const server = spawn("node", ["src/index.js"], {
    cwd: serverDir,
    stdio: "pipe",
    shell: true,
  });
  server.stdout.on("data", (d) => process.stdout.write(`${colors.green}[server]${colors.reset} ${d}`));
  server.stderr.on("data", (d) => process.stderr.write(`${colors.green}[server]${colors.reset} ${d}`));

  // Wait for ready
  for (let i = 0; i < 15; i++) {
    if (await checkPort(3000)) break;
    await sleep(1000);
  }
  if (await checkPort(3000)) {
    log("OK", "后端已就绪 (http://localhost:3000)");
  } else {
    log("ERROR", "后端启动超时");
    process.exit(1);
  }
}

// Start client
log("INFO", "启动前端...");
const client = spawn("npx", ["vite", "--port", "5173", "--strictPort"], {
  cwd: clientDir,
  stdio: "pipe",
  shell: true,
});
client.stdout.on("data", (d) => process.stdout.write(`${colors.cyan}[client]${colors.reset} ${d}`));
client.stderr.on("data", (d) => process.stderr.write(`${colors.cyan}[client]${colors.reset} ${d}`));

await sleep(3000);

console.log(`\n${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.magenta}  PixWave 已启动!${colors.reset}`);
console.log(`  前端: ${colors.green}http://localhost:5173${colors.reset}`);
console.log(`  后端: ${colors.green}http://localhost:3000${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);
console.log(`\n${colors.yellow}按 Ctrl+C 停止${colors.reset}\n`);

// Graceful shutdown
const cleanup = () => { client.kill(); process.exit(0); };
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
