<script setup>
import { onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const colors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
]

const form = ref({
  name: '',
  type: 'expense',
  color: '#6366f1'
})

const originalBodyOverflow = typeof document !== 'undefined' ? document.body.style.overflow : ''

watch(() => props.show, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
    if (props.item) {
      form.value = { ...props.item }
    } else {
      form.value = {
        name: '',
        type: 'expense',
        color: '#6366f1'
      }
    }
  } else {
    document.body.style.overflow = originalBodyOverflow
  }
})

onUnmounted(() => {
  document.body.style.overflow = originalBodyOverflow
})

function handleSave() {
  if (!form.value.name) return
  emit('save', { ...form.value })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="emit('cancel')">
      <div class="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-zinc-100">{{ item ? 'Edit Category' : 'New Category' }}</h3>
          <button @click="emit('cancel')" class="p-2 text-zinc-500 hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input 
          v-model="form.name" 
          placeholder="Category name"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm"
        />
        
        <div class="space-y-2">
          <label class="text-sm text-zinc-400">Type</label>
          <div class="flex gap-2">
            <button 
              @click="form.type = 'expense'"
              class="flex-1 h-10 rounded-lg text-sm font-medium transition-colors"
              :class="form.type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'"
            >
              Expense
            </button>
            <button 
              @click="form.type = 'income'"
              class="flex-1 h-10 rounded-lg text-sm font-medium transition-colors"
              :class="form.type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'"
            >
              Income
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm text-zinc-400">Color</label>
          <div class="flex gap-2 flex-wrap">
            <button 
              v-for="color in colors" 
              :key="color"
              @click="form.color = color"
              class="w-8 h-8 rounded-lg transition-transform"
              :style="{ backgroundColor: color }"
              :class="form.color === color ? 'ring-2 ring-white scale-110' : ''"
            />
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button 
            @click="emit('cancel')"
            class="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
          >
            Cancel
          </button>
          <button 
            @click="handleSave"
            class="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg text-sm"
          >
            {{ item ? 'Update' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
