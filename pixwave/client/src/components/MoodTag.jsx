const moodColors = {
  chill: { bg: "#2d6a4f", text: "#95d5b2" },
  energetic: { bg: "#c77d00", text: "#ffdd57" },
  melancholy: { bg: "#3a5a8c", text: "#a8c8f0" },
  romantic: { bg: "#9b3b5a", text: "#f0a0b8" },
  focus: { bg: "#4a4e69", text: "#c9c9d9" },
  morning: { bg: "#e0a96d", text: "#fff3e0" },
  night: { bg: "#1b2a4a", text: "#7ea8d4" },
};

export default function MoodTag({ mood }) {
  const style = moodColors[mood] || { bg: "#333", text: "#ccc" };
  return (
    <span className="mood-tag" style={{ background: style.bg, color: style.text }}>
      {mood}
    </span>
  );
}
