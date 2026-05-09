<script setup>
import { ref, watch, nextTick } from "vue";
import SongCard from "./SongCard.vue";

const props = defineProps({
  messages: { type: Array, default: () => [] },
  sending: { type: Boolean, default: false },
});

const emit = defineEmits(["play-song"]);

const scrollRef = ref(null);

watch(
  () => props.messages.length,
  async () => { await nextTick(); if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight; }
);
</script>

<template>
  <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none">
    <!-- Empty state -->
    <div v-if="messages.length === 0" class="flex items-center justify-center h-full">
      <div class="text-center space-y-3">
        <div class="font-mono text-2xl text-[#00FF41]/20 animate-pulse">♪ ♪ ♪</div>
        <p class="font-mono text-sm text-gray-600">等待 PixWave 的电波接入...</p>
        <p class="font-mono text-xs text-gray-700">在下方输入框输入你想听的风格</p>
      </div>
    </div>

    <!-- Messages -->
    <div v-for="(msg, i) in messages" :key="i" class="flex"
         :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
      <div class="max-w-[88%]">
        <!-- AI message -->
        <div v-if="msg.role === 'assistant'" class="text-left">
          <div class="inline-block p-2 border border-[#00FF41]/20 bg-[#0A0A0A]">
            <span class="font-mono text-xs text-[#00FF41]/60 mr-1">> PIXWAVE:</span>
            <span class="font-mono text-sm text-gray-300 leading-relaxed">{{ msg.content }}</span>
            <span v-if="msg.typing" class="inline-block w-2 h-3 bg-[#00FF41] align-middle ml-0.5 animate-pulse"></span>
          </div>

          <!-- SongCards for attachments -->
          <SongCard
            v-for="(att, j) in (msg.attachments || [])"
            :key="'att-' + i + '-' + j"
            :song="att"
            @play="emit('play-song', $event)"
          />
        </div>

        <!-- User message -->
        <div v-else class="inline-block p-2 border border-gray-800 bg-[#0A0A0A]">
          <span class="font-mono text-xs text-gray-600 mr-1">> YOU:</span>
          <span class="font-mono text-sm text-gray-400">{{ msg.content }}</span>
        </div>
      </div>
    </div>

    <!-- Sending indicator -->
    <div v-if="sending" class="flex justify-start">
      <div class="p-2 border border-[#00FF41]/10 bg-[#0A0A0A]">
        <span class="font-mono text-xs text-[#00FF41]/40">> PIXWAVE:</span>
        <span class="font-mono text-sm text-[#00FF41]/30 animate-pulse"> ...接收电波中...</span>
      </div>
    </div>
  </div>
</template>
