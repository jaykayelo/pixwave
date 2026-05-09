<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  mood: { type: String, default: "neutral" },
  isGlitching: { type: Boolean, default: false },
});

const emit = defineEmits(["update:mood"]);

const time = ref("--:--");
const date = ref("");
const weekday = ref("");

const moods = [
  { key: "neutral", face: "[-_-]", label: "平淡", color: "text-gray-600", glow: "" },
  { key: "happy",   face: "[^_^]", label: "开心", color: "text-[#FFD700]", glow: "shadow-[0_0_6px_rgba(255,215,0,0.3)]" },
  { key: "sad",     face: "[;_=]", label: "Emo",  color: "text-[#7B9EFF]", glow: "shadow-[0_0_6px_rgba(123,158,255,0.3)]" },
];

const currentMoodIndex = ref(0);

function toggleMood() {
  currentMoodIndex.value = (currentMoodIndex.value + 1) % moods.length;
  emit("update:mood", moods[currentMoodIndex.value].key);
}

// ── Clock ───────────────────────────────────────────────────
let timer;
function tick() {
  const now = new Date();
  time.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  date.value = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,"0")}.${String(now.getDate()).padStart(2,"0")}`;
  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  weekday.value = days[now.getDay()];
}

// ── PWA install ─────────────────────────────────────────────
const canInstall = ref(false);
let deferredPrompt = null;

onMounted(() => {
  tick();
  timer = setInterval(tick, 1000);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    canInstall.value = true;
  });
  window.addEventListener("appinstalled", () => {
    canInstall.value = false;
    deferredPrompt = null;
  });
});

onUnmounted(() => {
  clearInterval(timer);
});

async function handleInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") { canInstall.value = false; deferredPrompt = null; }
}
</script>

<template>
  <div class="relative flex flex-col items-center py-6 select-none">
    <!-- Mood toggle — top right -->
    <button
      @click="toggleMood"
      class="absolute top-4 right-4 font-mono text-xs px-2 py-1 border border-transparent hover:border-[#00FF41]/20 transition-all"
      :class="[moods[currentMoodIndex].color, moods[currentMoodIndex].glow]"
      :title="moods[currentMoodIndex].label"
    >
      {{ moods[currentMoodIndex].face }}
    </button>

    <!-- Install button — top left -->
    <button
      v-if="canInstall"
      @click="handleInstall"
      class="absolute top-4 left-4 font-mono text-[10px] px-2 py-1 border border-[#00FF41]/40 text-[#00FF41]/70 hover:border-[#00FF41] hover:text-[#00FF41] transition-all"
    >
      [+ APP]
    </button>

    <!-- ON AIR badge -->
    <div class="flex items-center gap-2 mb-3">
      <span class="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse shadow-[0_0_8px_#00FF41]"></span>
      <span class="font-mono text-[10px] text-[#00FF41] tracking-[0.3em]">ON AIR</span>
    </div>

    <!-- Big clock -->
    <div
      class="font-mono text-6xl text-[#00FF41] tracking-widest leading-none relative"
      :class="{ 'glitch-trigger': isGlitching }"
      :data-text="time"
    >
      {{ time }}
    </div>

    <!-- Date -->
    <div class="font-mono text-sm text-gray-500 mt-2 tracking-wider">
      {{ date }} <span class="text-[#00FF41]/40">{{ weekday }}</span>
    </div>
  </div>
</template>
