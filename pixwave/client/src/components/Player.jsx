export default function Player({ isPlaying, onToggle, onNext, onPrev, onSeek, duration, currentTime, noPlayableSource }) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(pct);
  };

  return (
    <div className="player-controls">
      <div className="seek-bar" onClick={handleSeek}>
        <div className="seek-fill" style={{ width: `${progress}%` }} />
        <div className="seek-thumb" style={{ left: `${progress}%` }} />
      </div>
      <div className="control-buttons">
        <button className="ctrl-btn prev" onClick={onPrev} title="上一首">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        </button>
        <button
          className={`ctrl-btn play ${isPlaying ? "paused" : ""} ${noPlayableSource ? "disabled" : ""}`}
          onClick={noPlayableSource ? undefined : onToggle}
          title={noPlayableSource ? "无可用音频源" : (isPlaying ? "暂停" : "播放")}
        >
          {isPlaying ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          )}
        </button>
        <button className="ctrl-btn next" onClick={onNext} title="下一首">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
        </button>
      </div>
    </div>
  );
}
