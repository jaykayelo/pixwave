export default function PlaylistPanel({ playlist, currentIndex, onSelect }) {
  if (!playlist || playlist.length === 0) {
    return (
      <div className="playlist-panel empty">
        <p>暂无歌单</p>
      </div>
    );
  }

  const songCount = playlist.filter((t) => t.type !== "tts").length;

  return (
    <div className="playlist-panel">
      <h3 className="playlist-title">本期歌单 ({songCount} 首歌)</h3>
      <ul className="playlist-list">
        {playlist.map((track, idx) => (
          <li
            key={`${track.type}-${track.order || idx}-${idx}`}
            className={`playlist-item ${idx === currentIndex ? "active" : ""} ${track.found === false ? "missing" : ""} ${track.type === "tts" ? "tts-item" : ""}`}
            onClick={() => onSelect(idx)}
          >
            {track.type === "tts" ? (
              <>
                <span className="track-order tts-icon">♪</span>
                <div className="track-detail">
                  <span className="track-name tts-label">PixWave 口播</span>
                  <span className="track-artist tts-preview">{track.text?.substring(0, 40)}...</span>
                </div>
              </>
            ) : (
              <>
                <span className="track-order">{track.order || idx + 1}</span>
                <div className="track-detail">
                  <span className="track-name">{track.songName}</span>
                  <span className="track-artist">{track.artist}</span>
                </div>
                {track.reason && <span className="track-why">{track.reason}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
