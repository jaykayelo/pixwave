export default function DJBanner({ currentScript, showTitle, mood, reason }) {
  if (!showTitle) {
    return (
      <div className="dj-banner empty">
        <p className="dj-placeholder">PixWave 电台待命中...</p>
      </div>
    );
  }

  return (
    <div className="dj-banner">
      <div className="dj-header">
        <h1 className="show-title">{showTitle}</h1>
        {mood && <span className="show-mood">{mood}</span>}
      </div>
      {reason && <p className="show-reason">{reason}</p>}
      {currentScript && (
        <div className="dj-script-bubble">
          <p className="dj-label">PixWave 说：</p>
          <p className="dj-text">{currentScript.text}</p>
        </div>
      )}
    </div>
  );
}
