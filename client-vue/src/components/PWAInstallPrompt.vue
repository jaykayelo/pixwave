<script setup>
import { ref, onMounted } from "vue";

const deferredPrompt = ref(null);
const showPrompt = ref(false);

onMounted(() => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showPrompt.value = true;
  });

  window.addEventListener("appinstalled", () => {
    showPrompt.value = false;
  });
});

async function install() {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === "accepted") showPrompt.value = false;
  deferredPrompt.value = null;
}

function dismiss() {
  showPrompt.value = false;
}
</script>

<template>
  <div
    v-if="showPrompt"
    class="fixed bottom-20 left-0 right-0 z-40 mx-4 p-3 border border-[#00FF41]/40 bg-[#0A0A0A]/95 backdrop-blur"
    style="box-shadow: 4px 4px 0px #00FF41;"
  >
    <div class="flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-mono text-xs text-[#00FF41]">INSTALL PIXWAVE FM</p>
        <p class="font-mono text-[10px] text-gray-600 mt-0.5">添加到桌面，像真正的电台一样</p>
      </div>
      <button @click="install" class="font-mono text-xs text-[#0A0A0A] bg-[#00FF41] px-3 py-1.5 hover:bg-[#00CC34] transition-colors">
        INSTALL
      </button>
      <button @click="dismiss" class="font-mono text-xs text-gray-600 hover:text-gray-400 transition-colors">
        ×
      </button>
    </div>
  </div>
</template>
