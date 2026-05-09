# PixWave — 个性化 AI 音乐电台

PixWave 是一个基于 Claude API 的智能音乐电台系统。它根据天气、日程、用户偏好等实时情境，自动策划个性化音乐节目，并生成 DJ 口播语音。

## 架构概览

```
外部上下文（Connectors）      本地大脑             交互表层（PWA）
┌─────────────────────┐    ┌──────────────┐    ┌──────────────────┐
│  OpenWeather  天气    │    │              │    │  正在播放 / 封面   │
│  飞书日历      日程    │───→│  Claude API  │───→│  DJ 台本气泡      │
│  网易云音乐    歌曲    │    │  (brain.js)  │    │  歌单 + 播放控制   │
│  Fish Audio    TTS    │    │              │    │  WebSocket 实时   │
│  本地语料库    偏好    │    └──────────────┘    └──────────────────┘
└─────────────────────┘          ↑
       ↑                        ↑
       └──── context.js ────────┘
              (组装引擎)

       scheduler.js → cron 定时 / 手动触发
```

## 目录结构

```
pixwave/
├── server/                     # Node.js 后端
│   ├── src/
│   │   ├── core/               # 核心引擎
│   │   │   ├── brain.js        # Claude API 封装
│   │   │   ├── context.js      # 上下文组装
│   │   │   ├── scheduler.js    # 定时调度
│   │   │   ├── router.js       # (预留) 路由层
│   │   │   └── ws.js           # WebSocket 广播
│   │   ├── connectors/         # 外部 API 适配器
│   │   │   ├── weather.js      # OpenWeather
│   │   │   ├── feishu.js       # 飞书日历
│   │   │   ├── netease.js      # 网易云音乐
│   │   │   └── fishaudio.js    # Fish Audio TTS
│   │   ├── corpus/             # 用户语料库
│   │   │   ├── profile.md      # 用户画像
│   │   │   ├── preferences.json # 偏好与调度配置
│   │   │   ├── history.json    # 历史记录
│   │   │   └── templates/
│   │   │       └── system-prompt.md
│   │   ├── utils/
│   │   │   ├── config.js       # 配置加载
│   │   │   ├── logger.js       # 日志
│   │   │   └── corpus.js       # 语料库解析
│   │   └── index.js            # 入口
│   ├── .env.example
│   └── package.json
├── client/                     # PWA 前端
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   │   ├── NowPlaying.jsx
│   │   │   ├── DJBanner.jsx
│   │   │   ├── PlaylistPanel.jsx
│   │   │   ├── Player.jsx
│   │   │   └── MoodTag.jsx
│   │   ├── hooks/
│   │   │   ├── useAudioPlayer.js
│   │   │   └── useWebSocket.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 快速开始

### 1. 环境准备

- Node.js >= 18
- （可选）[NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) 本地代理

### 2. 配置

```bash
cd server
cp .env.example .env
# 编辑 .env，填入 API Keys
```

| 变量 | 说明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 密钥（必填） |
| `OPENWEATHER_API_KEY` | OpenWeather API 密钥 |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书应用凭证 |
| `NETEASE_API_BASE` | 网易云 API 代理地址（默认 http://localhost:3001） |
| `FISHAUDIO_API_KEY` | Fish Audio TTS 密钥 |

未配置的 API 会自动降级为 mock 模式，不影响系统运行。

### 3. 启动

```bash
# 终端 1 — 后端
cd server
npm install
npm run dev

# 终端 2 — 前端
cd client
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`，点击「生成节目」。

### 4. 可选：启动网易云 API 代理

```bash
git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
cd NeteaseCloudMusicApi
npm install
npm run start    # 默认端口 3001
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 + WS 连接数 |
| GET | `/api/corpus` | 语料库快照 |
| GET | `/api/connectors` | 连接器配置状态 |
| GET | `/api/connectors/weather` | 天气数据 |
| GET | `/api/connectors/feishu` | 日程摘要 |
| GET | `/api/connectors/netease/search?q=` | 歌曲搜索 |
| POST | `/api/connectors/fishaudio/tts` | TTS 生成 |
| POST | `/api/shows/generate` | 手动生成节目 |
| GET | `/api/shows/current` | 当前节目 |
| GET | `/api/shows/history` | 历史节目 |
| POST | `/api/brain/generate` | 直接调用 Claude（自定义 context） |
| WS | `/ws` | WebSocket 实时推送 |

## WebSocket 事件

| 事件 | 载荷 | 说明 |
|------|------|------|
| `connected` | `{ total }` | 连接成功 |
| `pipeline_stage` | `{ stage, status }` | 生成流水线各阶段状态 |
| `show_generated` | `{ id, showTitle, playlist }` | 节目生成完毕（含完整歌单） |

## 自定义

- 用户画像：编辑 `server/src/corpus/profile.md`
- 调度策略：编辑 `server/src/corpus/preferences.json` 中的 `schedule.autoGenerate`
- System Prompt：编辑 `server/src/corpus/templates/system-prompt.md`
