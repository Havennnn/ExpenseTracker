<script setup>
const props = defineProps({
  show: Boolean,
  count: {
    type: Number,
    default: 0
  },
  deleteText: {
    type: String,
    default: 'Delete Selected'
  }
})

const emit = defineEmits(['delete'])
</script>

<template>
  <div v-if="show && count > 0" class="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between mx-4">
    <span class="text-sm text-zinc-400">{{ count }} selected</span>
    <button 
      @click="emit('delete')"
      class="text-sm text-red-400 hover:text-red-300"
    >
      {{ deleteText }}
    </button>
  </div>
</template>
