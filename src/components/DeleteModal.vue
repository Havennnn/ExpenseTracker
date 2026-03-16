<script setup>
const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Delete Item'
  },
  message: {
    type: String,
    default: 'Are you sure you want to delete this item? This action cannot be undone.'
  },
  confirmText: {
    type: String,
    default: 'Delete'
  }
})

const emit = defineEmits(['cancel', 'confirm'])
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="emit('cancel')">
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-sm">
      <h3 class="text-lg font-medium text-zinc-100 mb-2">{{ title }}</h3>
      <p class="text-zinc-400 text-sm mb-4">{{ message }}</p>
      
      <div class="flex gap-2">
        <button 
          @click="emit('cancel')"
          class="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
        >
          Cancel
        </button>
        <button 
          @click="emit('confirm')"
          class="flex-1 h-10 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg text-sm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
