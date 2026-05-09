export default function NowPlaying({ track, isPlaying, currentTime, duration, isTTS }) {
  if (!track) {
    return (
      <div className="now-playing empty">
        <div className="cover-placeholder" />
        <p className="track-hint">等待节目开始...</p>
      </div>
    );
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // TTS / DJ speaking item
  if (isTTS || track.type === "tts") {
    return (
      <div className="now-playing tts-mode">
        <div className="cover-art tts-cover">
          <div className="cover-placeholder tts-placeholder">♪</div>
          <div className={`playing-indicator ${isPlaying ? "active" : ""}`}>
            <span /><span /><span />
          </div>
        </div>
        <div className="track-info">
          <h2 className="track-name">PixWave 正在说话</h2>
          <p className="track-artist tts-text-preview">{track.text || ""}</p>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="time-labels">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="now-playing">
      <div className="cover-art">
        {track.cover ? (
          <img src={track.cover} alt={track.songName} />
        ) : (
          <div className="cover-placeholder" />
        )}
        <div className={`playing-indicator ${isPlaying ? "active" : ""}`}>
          <span /><span /><span />
        </div>
      </div>
      <div className="track-info">
        <h2 className="track-name">{track.songName || "未知曲目"}</h2>
        <p className="track-artist">{track.artist || "未知艺人"}</p>
        {track.reason && <p className="track-reason">{track.reason}</p>}
        {track.isFallback && (
          <div className="fallback-badge">
            <span>Demo 音轨</span>
          </div>
        )}
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="time-labels">
        <span>{fmtTime(currentTime)}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </div>
  );
}

function fmtTime(s) {
  if (!s || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
