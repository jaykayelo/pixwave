import { useRef, useState, useCallback, useEffect } from "react";

function getTrackUrl(track) {
  if (!track) return "";
  return track.audioUrl || track.url || track.fallbackUrl || "";
}

/**
 * HTML5 Audio player hook.
 * Manages a playlist queue with play/pause/skip/seek.
 */
export default function useAudioPlayer() {
  const audioRef = useRef(new Audio());
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [noPlayableSource, setNoPlayableSource] = useState(false);

  const audio = audioRef.current;

  // ── event bindings ──────────────────────────────────────────
  useEffect(() => {
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnd = () => playNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    audio.volume = volume;

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // ── queue management ────────────────────────────────────────
  const loadPlaylist = useCallback((tracks) => {
    setPlaylist(tracks);
    setCurrentIndex(tracks.length > 0 ? 0 : -1);
    if (tracks.length > 0) {
      audio.src = getTrackUrl(tracks[0]);
      audio.load();
    }
  }, []);

  const playTrack = useCallback((index) => {
    if (index < 0 || index >= playlist.length) return;
    const track = playlist[index];
    setCurrentIndex(index);
    audio.src = getTrackUrl(track);
    audio.play().catch(() => {});
  }, [playlist]);

  const togglePlay = useCallback(() => {
    if (!audio.src) {
      setNoPlayableSource(true);
      setTimeout(() => setNoPlayableSource(false), 3000);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const playNext = useCallback(() => {
    const next = currentIndex + 1;
    if (next < playlist.length) {
      playTrack(next);
    } else {
      setIsPlaying(false);
      setCurrentIndex(-1);
    }
  }, [currentIndex, playlist, playTrack]);

  const playPrev = useCallback(() => {
    if (currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prev = currentIndex - 1;
    if (prev >= 0) playTrack(prev);
  }, [currentIndex, currentTime, playTrack]);

  const seek = useCallback((pct) => {
    if (!audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
  }, []);

  const setVolume = useCallback((v) => {
    const val = Math.max(0, Math.min(1, v));
    setVolumeState(val);
    audio.volume = val;
  }, []);

  const currentTrack = playlist[currentIndex] || null;

  return {
    currentTrack,
    currentIndex,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    loadPlaylist,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    noPlayableSource,
  };
}
