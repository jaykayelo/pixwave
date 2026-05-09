#!/usr/bin/env bash
# PixWave — 一键启动脚本 (macOS / Linux / Git Bash)
# 用法: bash start.sh  或  chmod +x start.sh && ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

# ── 颜色 ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${MAGENTA}  PixWave — AI 音乐电台${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# ── 检查 Node.js ──────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] 未找到 Node.js，请先安装: https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"

# ── 安装依赖 ──────────────────────────────────────────────
if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo -e "${YELLOW}[...] 安装后端依赖...${NC}"
    (cd "$SERVER_DIR" && npm install)
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    echo -e "${YELLOW}[...] 安装前端依赖...${NC}"
    (cd "$CLIENT_DIR" && npm install)
fi

# ── 检查 .env ─────────────────────────────────────────────
if [ ! -f "$SERVER_DIR/.env" ]; then
    cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
    echo -e "${YELLOW}[WARN] 已创建 server/.env，请编辑填入 API Keys${NC}"
    echo -e "${YELLOW}       未配置的 API 将使用 mock 模式运行${NC}"
fi

# ── 清理函数 ──────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}[...] 正在停止服务...${NC}"
    [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
    [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null
    wait 2>/dev/null
    echo -e "${GREEN}[OK] 服务已停止${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── 启动后端 ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}>>> 启动后端服务器...${NC}"
(cd "$SERVER_DIR" && node src/index.js) &
SERVER_PID=$!

# 等待后端就绪
for i in $(seq 1 15); do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} 后端已就绪 (http://localhost:3000)"
        break
    fi
    sleep 1
done

if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${RED}[ERROR] 后端启动失败${NC}"
    exit 1
fi

# ── 启动前端 ──────────────────────────────────────────────
echo -e "${CYAN}>>> 启动前端开发服务器...${NC}"
(cd "$CLIENT_DIR" && npx vite --port 5173 --strictPort) &
CLIENT_PID=$!
sleep 3
echo -e "${GREEN}[OK]${NC} 前端已就绪 (http://localhost:5173)"

# ── 完成 ──────────────────────────────────────────────────
echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${MAGENTA}  PixWave 已启动!${NC}"
echo -e "  前端: ${GREEN}http://localhost:5173${NC}"
echo -e "  后端: ${GREEN}http://localhost:3000${NC}"
echo -e "  API:  http://localhost:3000/api/health"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}"
echo ""

# ── 等待 ──────────────────────────────────────────────────
wait
