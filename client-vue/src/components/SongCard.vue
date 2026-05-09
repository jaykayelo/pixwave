<script setup>
defineProps({
  song: { type: Object, required: true },
});

const emit = defineEmits(["play"]);
</script>

<template>
  <div
    @click="emit('play', song)"
    class="mt-2 border border-[#00FF41]/20 bg-[#0A0A0A] px-3 py-2 cursor-pointer
           hover:border-[#00FF41]/50 hover:bg-[#00FF41]/5
           active:bg-[#00FF41]/10 transition-all select-none"
    style="box-shadow: 2px 2px 0px rgba(0,255,65,0.15);"
  >
    <div class="flex items-center gap-3">
      <!-- Play icon -->
      <div class="w-8 h-8 border border-[#00FF41]/30 flex items-center justify-center flex-shrink-0">
        <span class="text-[#00FF41] text-xs">▶</span>
      </div>
      <!-- Info -->
      <div class="min-w-0">
        <p class="font-mono text-sm text-[#00FF41] truncate">{{ song.songName || song.title }}</p>
        <p class="font-mono text-xs text-gray-500 truncate">{{ song.artist || '—' }}
          <span v-if="song.source && song.source !== 'none'" class="text-[#00FF41]/40 ml-1">[{{ song.source }}]</span>
          <span v-else class="text-gray-700 ml-1">[未找到]</span>
        </p>
      </div>
      <!-- Arrow hint -->
      <span class="text-[#00FF41]/30 text-xs flex-shrink-0">→</span>
    </div>
  </div>
</template>
