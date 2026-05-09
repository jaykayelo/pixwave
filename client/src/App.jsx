import { useState, useEffect, useCallback } from "react";
import useAudioPlayer from "./hooks/useAudioPlayer.js";
import useWebSocket from "./hooks/useWebSocket.js";
import NowPlaying from "./components/NowPlaying.jsx";
import DJBanner from "./components/DJBanner.jsx";
import PlaylistPanel from "./components/PlaylistPanel.jsx";
import Player from "./components/Player.jsx";
import ChatPanel from "./components/ChatPanel.jsx";

const API = "/api";

export default function App() {
  const audio = useAudioPlayer();
  const ws = useWebSocket();
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("player"); // "player" | "playlist" | "chat"
  const [status, setStatus] = useState("空闲中");

  // ── Fetch current show on mount ─────────────────────────────
  useEffect(() => {
    fetch(`${API}/shows/current`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setShow(res.data);
          audio.loadPlaylist(res.data.playlist || []);
        }
      })
      .catch(() => {});
  }, []);

  // ── WebSocket event handlers ────────────────────────────────
  useEffect(() => {
    const unsubs = [
      ws.subscribe("show_generated", (data) => {
        setShow((prev) => ({ ...prev, ...data, playlist: data.playlist }));
        audio.loadPlaylist(data.playlist || []);
        setStatus(`节目已就绪: ${data.showTitle}`);
        setTab("player");
      }),
      ws.subscribe("pipeline_stage", (data) => {
        const labels = {
          context: "采集环境中...",
          brain: "AI 正在选曲...",
          resolve: "搜索歌曲链接...",
          tts: "合成 DJ 语音...",
        };
        if (data.status === "started") {
          setStatus(labels[data.stage] || data.stage);
        }
      }),
      ws.subscribe("chat_action", (data) => {
        if (data.action === "skip") audio.playNext();
        if (data.action === "like") setStatus("已收藏当前歌曲");
        if (data.action === "dislike") audio.playNext();
      }),
      ws.subscribe("connected", (data) => {
        setStatus(`已连接 (${data.total} 在线)`);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [ws, audio]);

  // ── Trigger show generation ─────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setStatus("正在生成节目...");
    try {
      const res = await fetch(`${API}/shows/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "PWA 手动触发" }),
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setShow(json.data);
        audio.loadPlaylist(json.data.playlist || []);
        setStatus(`节目已生成: ${json.data.showTitle}`);
      } else {
        setStatus("生成失败: " + (json.error || "未知错误"));
      }
    } catch {
      setStatus("网络错误");
    } finally {
      setLoading(false);
    }
  }, [audio]);

  // ── Chat action handler ─────────────────────────────────────
  const handleChatAction = useCallback((action) => {
    switch (action) {
      case "skip":
        audio.playNext();
        setStatus("已跳过");
        break;
      case "regenerate":
        handleGenerate();
        break;
      case "like":
        setStatus("已收藏当前歌曲");
        break;
      case "dislike":
        audio.playNext();
        break;
      default:
        if (action.startsWith("search:")) {
          handleGenerate();
        }
    }
  }, [audio, handleGenerate]);

  // ── Current DJ script ───────────────────────────────────────
  const currentItem = audio.currentTrack;
  const isTTS = currentItem?.type === "tts";
  const currentDjText = isTTS ? currentItem.text : null;
  const currentScript = !isTTS && show?.djScripts?.find(
    (s) => s.beforeTrack === currentItem?.order
  ) || null;
  const displayScript = currentDjText ? { text: currentDjText } : currentScript;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="logo">PixWave</h1>
        <span className="subtitle">AI 音乐电台</span>
        <span
          className={`status-dot ${ws.connected ? "live" : ""}`}
          title={status}
        />
      </header>

      <main className="app-main">
        {tab === "chat" ? (
          <ChatPanel onChatAction={handleChatAction} />
        ) : tab === "player" ? (
          <>
            <DJBanner
              showTitle={show?.showTitle}
              mood={show?.mood}
              reason={show?.reason}
              currentScript={displayScript}
              isTTS={isTTS}
            />
            <NowPlaying
              track={currentItem}
              isPlaying={audio.isPlaying}
              currentTime={audio.currentTime}
              duration={audio.duration}
              isTTS={isTTS}
            />
          </>
        ) : (
          <PlaylistPanel
            playlist={audio.playlist}
            currentIndex={audio.currentIndex}
            onSelect={(idx) => {
              audio.playTrack(idx);
              setTab("player");
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        <Player
          isPlaying={audio.isPlaying}
          onToggle={audio.togglePlay}
          onNext={audio.playNext}
          onPrev={audio.playPrev}
          onSeek={audio.seek}
          currentTime={audio.currentTime}
          duration={audio.duration}
          noPlayableSource={audio.noPlayableSource}
        />
      </footer>

      <nav className="bottom-nav">
        <button
          className={`nav-btn ${tab === "player" ? "active" : ""}`}
          onClick={() => setTab("player")}
        >
          正在播放
        </button>
        <button
          className={`nav-btn ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
        >
          聊天
        </button>
        <button
          className={`nav-btn generate-btn ${loading ? "spinning" : ""}`}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "生成中..." : "生成节目"}
        </button>
        <button
          className={`nav-btn ${tab === "playlist" ? "active" : ""}`}
          onClick={() => setTab("playlist")}
        >
          歌单
        </button>
      </nav>
    </div>
  );
}
