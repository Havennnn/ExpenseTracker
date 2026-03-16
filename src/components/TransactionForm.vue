<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  type: {
    type: String,
    default: 'expense' // 'expense' or 'income'
  },
  categories: {
    type: Array,
    default: () => []
  },
  buttonColor: {
    type: String,
    default: 'bg-zinc-100'
  },
  buttonTextColor: {
    type: String,
    default: 'text-zinc-900'
  },
  isSubmitting: {
    type: Boolean,
    default: false
  },
  item: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

const form = ref({
  description: '',
  amount: '',
  categoryId: '',
  date: new Date().toISOString().split('T')[0]
})

const originalBodyOverflow = typeof document !== 'undefined' ? document.body.style.overflow : ''

const inputLabel = computed(() => props.type === 'expense' ? 'Description' : 'Source')

watch(() => props.show, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
    form.value = {
      description: '',
      amount: '',
      categoryId: '',
      date: new Date().toISOString().split('T')[0]
    }
  } else {
    document.body.style.overflow = originalBodyOverflow
  }
})

onUnmounted(() => {
  document.body.style.overflow = originalBodyOverflow
})

function handleSave() {
  if (props.isSubmitting) return
  if (!form.value.description || !form.value.amount) return
  if (!form.value.categoryId) {
    alert('Please select a category')
    return
  }
  
  // Map description to source for income type
  const data = {
    description: form.value.description,
    source: form.value.description,
    amount: form.value.amount,
    date: form.value.date,
    categoryId: form.value.categoryId
  }
  
  emit('save', data)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="!isSubmitting && emit('cancel')">
      <div class="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-zinc-100">{{ type === 'expense' ? 'Add Expense' : 'Add Income' }}</h3>
          <button @click="emit('cancel')" :disabled="isSubmitting" class="p-2 text-zinc-500 hover:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input 
          v-model="form.description" 
          :placeholder="inputLabel"
          :disabled="isSubmitting"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm"
        />
        <input 
          v-model="form.amount" 
          type="number"
          step="0.01"
          placeholder="Amount"
          :disabled="isSubmitting"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 text-sm"
        />
        <input 
          v-model="form.date" 
          type="date"
          :disabled="isSubmitting"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
        />
        <select 
          v-model="form.categoryId"
          required
          :disabled="isSubmitting"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
        >
          <option value="">Select category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <div class="flex gap-2 pt-1">
          <button 
            @click="emit('cancel')"
            :disabled="isSubmitting"
            class="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button 
            @click="handleSave"
            :disabled="isSubmitting"
            class="flex-1 h-10 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            :class="`${buttonColor} ${buttonTextColor}`"
          >
            {{ isSubmitting ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
