<script setup>
import { ref, nextTick, watch } from "vue";

const props = defineProps({
  messages: { type: Array, default: () => [] },
  sending: { type: Boolean, default: false },
});

const emit = defineEmits(["send"]);

const input = ref("");
const scrollRef = ref(null);

// Auto-scroll to bottom
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  }
);

function sendMessage() {
  const text = input.value.trim();
  if (!text || props.sending) return;
  emit("send", text);
  input.value = "";
}
</script>

<template>
  <div class="flex flex-col h-full font-mono">
    <!-- 消息滚动区 -->
    <div
      ref="scrollRef"
      class="flex-1 overflow-y-auto space-y-3 mb-3 pr-1"
    >
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center space-y-2">
          <p class="text-acid/60 text-sm animate-pulse">
            > PIXWAVE 电台待命中...
          </p>
          <p class="text-gray-600 text-xs">
            输入「jazz」「摇滚」「chill」或直接聊天
          </p>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <!-- AI 消息带打字光标 -->
        <div
          v-if="msg.role === 'assistant'"
          class="inline-block max-w-[85%] p-2 border border-acid/30 bg-black/60 text-acid/90 text-sm"
        >
          <span class="text-acid text-xs mr-1">> PIXWAVE:</span>
          <span>{{ msg.content }}</span>
          <span v-if="msg.typing" class="cursor-blink inline-block w-2 h-3 bg-acid align-middle ml-0.5"></span>
        </div>

        <!-- 用户消息 -->
        <div
          v-else
          class="inline-block max-w-[85%] p-2 border border-cyber/30 bg-black/60 text-cyber/90 text-sm text-left"
        >
          <span class="text-cyber/60 text-xs mr-1">> YOU:</span>
          <span>{{ msg.content }}</span>
        </div>
      </div>

      <!-- 发送中占位 -->
      <div v-if="sending" class="flex justify-start">
        <div class="inline-block p-2 border border-acid/20 bg-black/60 text-acid/60 text-sm">
          <span class="text-acid/40 text-xs">> PIXWAVE:</span>
          <span class="animate-pulse">...</span>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="relative flex-shrink-0">
      <input
        v-model="input"
        type="text"
        class="w-full bg-black border-2 border-acid p-3 text-acid text-sm placeholder:text-gray-500 focus:outline-none focus:border-acid transition-colors"
        style="box-shadow: 4px 4px 0px #00FF41;"
        placeholder="输入指令..."
        @keyup.enter="sendMessage"
        :disabled="sending"
        autofocus
      />
      <div class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-acid/40 font-pixel hidden sm:block">
        ENTER ↵
      </div>
    </div>
  </div>
</template>
