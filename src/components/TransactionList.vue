<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  type: {
    type: String,
    default: 'expense' // 'expense' or 'income'
  },
  isBulkMode: {
    type: Boolean,
    default: false
  },
  selectedItems: {
    type: Array,
    default: () => []
  },
  amountPrefix: {
    type: String,
    default: '-$'
  },
  amountColor: {
    type: String,
    default: 'text-zinc-100'
  }
})

const emit = defineEmits(['toggleSelect', 'confirmDelete'])

const groupedItems = computed(() => {
  const groups = {}
  props.items.forEach(item => {
    const date = item.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(item)
  })
  return groups
})

const groupedSections = computed(() => {
  const sortedDates = Object.keys(groupedItems.value).sort((a, b) => new Date(b) - new Date(a))
  let currentMonth = ''

  return sortedDates.map(date => {
    const monthLabel = formatMonth(date)
    const showMonthHeading = monthLabel !== currentMonth
    currentMonth = monthLabel

    return {
      date,
      items: groupedItems.value[date],
      monthLabel,
      showMonthHeading
    }
  })
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMonth(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getItemName(item) {
  return item.description || item.source || item.name || 'Unknown'
}

function getCategoryName(item) {
  return item.category_name || item.name || 'Other'
}
</script>

<template>
  <div>
    <!-- Grouped by Date -->
    <div v-for="section in groupedSections" :key="section.date" class="space-y-3">
      <h3 v-if="section.showMonthHeading" class="text-sm font-medium text-zinc-500 mb-2 px-4">{{ section.monthLabel }}</h3>
      <div class="space-y-3 px-4">
        <div 
          v-for="item in section.items" 
          :key="item.id"
          class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between"
        >
          <!-- Checkbox for bulk mode -->
          <div v-if="isBulkMode" class="mr-2">
            <input 
              type="checkbox" 
              :checked="selectedItems.includes(item.id)"
              @change="emit('toggleSelect', item.id)"
              class="w-4 h-4 rounded border-zinc-600 bg-zinc-800"
              :class="type === 'income' ? 'text-emerald-500' : 'text-red-500'"
            />
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <p class="text-zinc-100 font-medium truncate">{{ getItemName(item) }}</p>
              <p 
                class="font-medium ml-2 whitespace-nowrap" 
                :class="type === 'income' ? 'text-emerald-400' : amountColor"
              >
                {{ amountPrefix }}{{ Number(item.amount).toFixed(2) }}
              </p>
            </div>
            <div class="flex items-center justify-between mt-1">
              <p class="text-xs text-zinc-500">{{ getCategoryName(item) }} • {{ formatDate(item.date) }}</p>
              <button 
                v-if="!isBulkMode"
                @click="emit('confirmDelete', item.id)" 
                class="p-1 text-zinc-600 hover:text-red-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
