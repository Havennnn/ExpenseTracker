<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { getBudgetMascotEventName } from '../lib/budgetMascot'

const activeAlert = ref(null)

function dismissAlert() {
  activeAlert.value = null
}

function showAlert(event) {
  activeAlert.value = event.detail
}

onMounted(() => {
  window.addEventListener(getBudgetMascotEventName(), showAlert)
})

onUnmounted(() => {
  window.removeEventListener(getBudgetMascotEventName(), showAlert)
})
</script>

<template>
  <Teleport to="body">
    <button
      v-if="activeAlert"
      type="button"
      class="fixed inset-0 z-[70] bg-transparent text-left"
      @click="dismissAlert"
    >
      <div class="pointer-events-none mx-auto flex h-full max-w-sm items-end justify-end px-4 pb-24">
        <div class="flex max-w-[19rem] items-end gap-0">
          <div class="relative mb-16 min-w-[11.5rem] rounded-[1.5rem] border border-zinc-700 bg-zinc-950/95 px-4 py-3 text-xs text-zinc-100 shadow-2xl">
            <p class="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">Piya</p>
            <p>{{ activeAlert.line }}</p>
            <span class="absolute -bottom-2 right-5 block h-4 w-4 rotate-45 border-b border-r border-zinc-700 bg-zinc-950/95"></span>
          </div>
          <img
            :src="`/${activeAlert.image}`"
            :alt="`Budget mascot ${activeAlert.tone}`"
            class="-ml-6 h-32 w-32 shrink-0 object-contain drop-shadow-2xl"
          />
        </div>
      </div>
    </button>
  </Teleport>
</template>
