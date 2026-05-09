<script setup>
import { ref, reactive } from "vue";
import DigitalHeader from "./components/DigitalHeader.vue";
import StickyPlayer from "./components/StickyPlayer.vue";
import ChatStream from "./components/ChatStream.vue";
import CommandInput from "./components/CommandInput.vue";
import PWAInstallPrompt from "./components/PWAInstallPrompt.vue";

const API = "/api";
const audio = new Audio();

// ── Glitch effect ────────────────────────────────────────────
const isGlitching = ref(false);
let glitchTimer = null;

function triggerRandomGlitch() {
  const delay = 5000 + Math.random() * 10000; // 5-15s
  glitchTimer = setTimeout(() => {
    isGlitching.value = true;
    setTimeout(() => { isGlitching.value = false; }, 200 + Math.random() * 200); // 200-400ms
    triggerRandomGlitch();
  }, delay);
}

import { onMounted, onUnmounted } from "vue";

onMounted(() => { triggerRandomGlitch(); });
onUnmounted(() => { clearTimeout(glitchTimer); });

// ── Mood ────────────────────────────────────────────────────
const currentMood = ref("neutral");

// ── Player state ────────────────────────────────────────────
const playlist = ref([]);        // accumulated playable tracks
const currentIndex = ref(-1);
const currentTrack = ref(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

audio.addEventListener("timeupdate", () => { currentTime.value = audio.currentTime; });
audio.addEventListener("loadedmetadata", () => { duration.value = audio.duration || 0; });
audio.addEventListener("play", () => { isPlaying.value = true; });
audio.addEventListener("pause", () => { isPlaying.value = false; });
audio.addEventListener("ended", () => { playNext(); });
audio.volume = 0.7;

function playTrack(track) {
  if (!track?.url) return;
  const idx = playlist.value.findIndex(t => t.url === track.url);
  if (idx >= 0) currentIndex.value = idx;
  currentTrack.value = track;
  audio.src = track.url;
  audio.load();
  audio.play().catch(() => {});
}

function playNext() {
  if (playlist.value.length === 0) return;
  const next = (currentIndex.value + 1) % playlist.value.length;
  playTrack(playlist.value[next]);
}

function playPrev() {
  if (playlist.value.length === 0) return;
  if (currentTime.value > 3) { audio.currentTime = 0; return; }
  const prev = currentIndex.value <= 0 ? playlist.value.length - 1 : currentIndex.value - 1;
  playTrack(playlist.value[prev]);
}

function togglePlay() {
  if (!currentTrack.value?.url) return;
  if (audio.src !== currentTrack.value.url) {
    audio.src = currentTrack.value.url;
    audio.load();
  }
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

function seek(pct) {
  if (duration.value > 0) audio.currentTime = (pct / 100) * duration.value;
}

// ── Chat state ──────────────────────────────────────────────
const messages = ref([]);
const sending = ref(false);

async function handleSend(text) {
  messages.value.push({ role: "user", content: text });
  sending.value = true;

  try {
    const res = await fetch(`${API}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        mood: currentMood.value,
        history: messages.value.slice(-10).map(m => ({ role: m.role, content: m.content })),
      }),
    });
    const json = await res.json();

    if (json.ok) {
      const data = json.data;
      const aiMsg = reactive({
        role: "assistant",
        content: "",
        typing: true,
        attachments: data.attachments || [],
      });
      messages.value.push(aiMsg);

      // Typewriter
      const reply = data.reply || "...";
      let i = 0;
      await new Promise(r => {
        const t = setInterval(() => {
          if (i < reply.length) { aiMsg.content += reply[i]; i++; }
          else { aiMsg.typing = false; clearInterval(t); r(); }
        }, 25);
      });

      // Auto-play first resolved track
      // Collect all playable tracks into the playlist queue
      if (data.attachments) {
        for (const att of data.attachments) {
          if (att.url && !playlist.value.find(t => t.url === att.url)) {
            playlist.value.push(att);
          }
        }
      }
      // Play first resolved track
      if (data.resolvedTrack?.url) {
        playTrack(data.resolvedTrack);
      }
    } else {
      messages.value.push({ role: "assistant", content: "(信号干扰... 无法连接大脑)" });
    }
  } catch {
    messages.value.push({ role: "assistant", content: "(网络开小差了...)" });
  } finally {
    sending.value = false;
  }
}

function handlePlaySong(song) {
  playTrack(song);
}
</script>

<template>
  <div
    class="h-screen w-screen max-w-md mx-auto flex flex-col bg-[#0A0A0A] text-gray-300"
    :class="{ 'glitch-container': isGlitching }"
  >
    <!-- Scanline overlay -->
    <div class="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
         style="background: repeating-linear-gradient(0deg, #00FF41 0px, #00FF41 1px, transparent 1px, transparent 3px);">
    </div>

    <!-- 1. DigitalHeader -->
    <DigitalHeader v-model:mood="currentMood" :isGlitching="isGlitching" />

    <!-- 2. StickyPlayer (sticky below header) -->
    <StickyPlayer
      :track="currentTrack"
      :isPlaying="isPlaying"
      :currentTime="currentTime"
      :duration="duration"
      @toggle="togglePlay"
      @seek="seek"
      @next="playNext"
      @prev="playPrev"
    />

    <!-- 3. ChatStream -->
    <ChatStream
      :messages="messages"
      :sending="sending"
      @play-song="handlePlaySong"
    />

    <!-- 4. CommandInput -->
    <CommandInput
      :sending="sending"
      @send="handleSend"
    />

    <!-- PWA Install Prompt -->
    <PWAInstallPrompt />
  </div>
</template>
