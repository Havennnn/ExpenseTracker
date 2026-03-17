<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: String,
  addButtonColor: {
    type: String,
    default: 'bg-zinc-100'
  },
  addButtonTextColor: {
    type: String,
    default: 'text-zinc-900'
  },
  showDateFilter: {
    type: Boolean,
    default: true
  },
  showCategoryFilter: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  },
  isBulkMode: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['search', 'toggleDateFilter', 'toggleAddForm', 'toggleBulkMode'])

const searchQuery = ref('')
const showDateModal = ref(false)
const hasDateFilter = ref(false)
const selectedCategoryId = ref('')
const startDate = ref('')
const endDate = ref('')

const hasActiveFilter = computed(() => hasDateFilter.value || Boolean(selectedCategoryId.value))

function handleSearch() {
  emit('search', searchQuery.value, startDate.value, endDate.value, selectedCategoryId.value)
}

function toggleDateFilter() {
  if (hasActiveFilter.value) {
    clearDateFilter()
  } else {
    showDateModal.value = true
  }
}

function applyDateFilter() {
  hasDateFilter.value = Boolean(startDate.value || endDate.value)
  showDateModal.value = false
  emit('search', searchQuery.value, startDate.value, endDate.value, selectedCategoryId.value)
}

function clearDateFilter() {
  startDate.value = ''
  endDate.value = ''
  hasDateFilter.value = false
  selectedCategoryId.value = ''
  showDateModal.value = false
  emit('search', searchQuery.value, '', '', '')
}
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
    <div class="max-w-sm mx-auto px-4 py-3 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-zinc-100">{{ title }}</h1>
          <p class="text-xs text-zinc-500">Search, filter, and manage entries</p>
        </div>
        <button 
          @click="emit('toggleBulkMode')"
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 transition-colors"
          :class="isBulkMode ? 'text-red-400' : 'text-zinc-400 hover:text-zinc-200'"
          :aria-label="isBulkMode ? 'Exit selection mode' : 'Enter selection mode'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h11M9 12h11M9 18h11" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.5 4.5h3v3h-3zM3.5 10.5h3v3h-3zM3.5 16.5h3v3h-3z" />
          </svg>
        </button>
      </div>

      <!-- Search & Filter Row -->
      <div class="flex items-center gap-2">
        <div class="flex-1 relative">
          <input 
            v-model="searchQuery" 
            @input="handleSearch"
            type="text" 
            placeholder="Search..."
            class="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <button 
          v-if="showDateFilter || showCategoryFilter"
          @click="toggleDateFilter"
          class="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-800 transition-colors"
          :class="hasActiveFilter ? 'bg-red-500/15 text-red-400' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
        >
          <svg v-if="!hasActiveFilter" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button 
          @click="emit('toggleAddForm')"
          class="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
          :class="`${addButtonColor} ${addButtonTextColor}`"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      
      <!-- Active Filters Display -->
      <div v-if="hasActiveFilter" class="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span>Filter:</span>
        <span v-if="hasDateFilter" class="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">{{ startDate }} - {{ endDate }}</span>
        <span v-if="selectedCategoryId" class="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1">
          {{ categories.find(category => String(category.id) === String(selectedCategoryId))?.name || 'Category' }}
        </span>
        <button @click="clearDateFilter" class="text-red-400 hover:text-red-300">Clear</button>
      </div>
    </div>

  </header>

  <Teleport to="body">
    <div v-if="showDateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="showDateModal = false">
      <div class="w-full max-w-sm rounded-[1.5rem] border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
        <h3 class="text-lg font-medium text-zinc-100 mb-4">Filters</h3>
        
        <div class="space-y-3">
          <div v-if="showCategoryFilter">
            <label class="text-sm text-zinc-400">Category</label>
            <select
              v-model="selectedCategoryId"
              class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm mt-1"
            >
              <option value="">All categories</option>
              <option v-for="category in categories" :key="category.id" :value="String(category.id)">
                {{ category.name }}
              </option>
            </select>
          </div>

          <div v-if="showDateFilter">
            <label class="text-sm text-zinc-400">Start Date</label>
            <input 
              v-model="startDate" 
              type="date" 
              class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm mt-1"
            />
          </div>
          
          <div v-if="showDateFilter">
            <label class="text-sm text-zinc-400">End Date</label>
            <input 
              v-model="endDate" 
              type="date" 
              class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm mt-1"
            />
          </div>
        </div>

        <div class="flex gap-2 mt-4">
          <button 
            @click="clearDateFilter"
            class="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm"
          >
            Clear
          </button>
          <button 
            @click="applyDateFilter"
            class="flex-1 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg text-sm"
          >
            Apply
          </button>
        </div>
        
        <button 
          @click="showDateModal = false"
          class="w-full h-10 mt-2 text-zinc-500 hover:text-zinc-300 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  </Teleport>
</template>
