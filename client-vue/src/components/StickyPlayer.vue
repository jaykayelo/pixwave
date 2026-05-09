<script setup>
import { computed } from "vue";

const props = defineProps({
  track: { type: Object, default: null },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
});

const emit = defineEmits(["toggle", "next", "prev", "seek"]);

const progress = computed(() =>
  props.duration > 0 ? (props.currentTime / props.duration) * 100 : 0
);

// Visualizer bars —  random static heights
const bars = Array.from({ length: 16 }, () => Math.floor(Math.random() * 100));
</script>

<template>
  <div class="sticky top-0 z-20 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#2A2A2A]">
    <!-- Visualizer bars -->
    <div class="flex items-end justify-center gap-[2px] h-6 px-4 pt-2">
      <div
        v-for="(h, i) in bars"
        :key="i"
        class="w-1 bg-[#00FF41]/20 transition-all duration-300"
        :class="{ '!bg-[#00FF41]/60': isPlaying }"
        :style="{ height: isPlaying ? `${10 + Math.sin(Date.now()/200 + i) * 40 + 50}%` : `${h}%` }"
      ></div>
    </div>

    <!-- Track info -->
    <div class="px-4 py-2">
      <div class="flex items-center gap-3">
        <!-- Cover placeholder -->
        <div class="w-12 h-12 border border-[#2A2A2A] flex items-center justify-center flex-shrink-0 bg-[#111]">
          <span class="text-gray-700 text-lg">♪</span>
        </div>

        <!-- Title + Artist -->
        <div class="flex-1 min-w-0">
          <p class="font-mono text-sm text-gray-200 truncate">
            {{ track?.songName || track?.title || '等待电波...' }}
          </p>
          <p class="font-mono text-xs text-gray-600 truncate">
            {{ track?.artist || 'PixWave FM' }}
            <span v-if="track?.source && track?.source !== 'none'" class="text-[#00FF41]/40 ml-1">[{{ track.source }}]</span>
          </p>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button @click="emit('prev')" class="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-[#00FF41] transition-colors">
            <span class="text-sm">⏮</span>
          </button>
          <button @click="emit('toggle')" class="w-9 h-9 border flex items-center justify-center"
            :class="track?.url ? 'border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41]/10' : 'border-gray-700 text-gray-700'"
            :style="track?.url ? 'box-shadow: 2px 2px 0px #00FF41;' : ''"
          >
            <span class="text-sm">{{ isPlaying ? '⏸' : '▶' }}</span>
          </button>
          <button @click="emit('next')" class="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-[#00FF41] transition-colors">
            <span class="text-sm">⏭</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Progress bar -->
    <div
      class="h-3 bg-[#111] cursor-pointer group relative flex items-center"
      @click="e => { const r = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)); emit('seek', pct); }"
    >
      <div class="absolute inset-y-0 left-0 bg-[#00FF41]/20 group-hover:bg-[#00FF41]/30 transition-all duration-200" :style="{ width: progress + '%' }"></div>
      <div class="absolute top-0 bottom-0 w-[2px] bg-[#00FF41] group-hover:w-[3px] transition-all" :style="{ left: progress + '%' }"></div>
    </div>
  </div>
</template>
