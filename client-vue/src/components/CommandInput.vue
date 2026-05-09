<script setup>
import { ref } from "vue";

const props = defineProps({
  sending: { type: Boolean, default: false },
});

const emit = defineEmits(["send"]);

const input = ref("");

function send() {
  const text = input.value.trim();
  if (!text || props.sending) return;
  emit("send", text);
  input.value = "";
}
</script>

<template>
  <div class="flex-shrink-0 px-4 py-3 border-t border-[#2A2A2A] bg-[#0A0A0A]">
    <div class="relative">
      <input
        v-model="input"
        type="text"
        class="w-full bg-transparent border-b border-[#2A2A2A] pb-2 pt-1 text-sm text-gray-300
               placeholder:text-gray-700 focus:outline-none focus:border-[#00FF41]/50
               transition-colors font-mono"
        placeholder="Say something to the DJ..."
        @keyup.enter="send"
        :disabled="sending"
        autofocus
      />
      <div class="absolute right-0 bottom-2 text-xs text-gray-700 flex items-center gap-1">
        <span class="hidden sm:inline font-mono">ENTER ↵</span>
      </div>
    </div>
  </div>
</template>
