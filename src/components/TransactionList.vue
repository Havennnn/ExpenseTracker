<script setup>
import { computed } from 'vue'
import { formatCurrency } from '../lib/utils'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  type: {
    type: String,
    default: 'expense'
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
    default: '-'
  },
  amountColor: {
    type: String,
    default: 'text-zinc-100'
  }
})

const emit = defineEmits(['toggleSelect', 'confirmDelete'])

const groupedSections = computed(() => {
  const monthMap = new Map()

  props.items.forEach(item => {
    const monthKey = item.date.slice(0, 7)
    const monthLabel = formatMonth(item.date)

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        monthLabel,
        days: new Map()
      })
    }

    const monthGroup = monthMap.get(monthKey)
    if (!monthGroup.days.has(item.date)) {
      monthGroup.days.set(item.date, {
        date: item.date,
        dayLabel: formatDay(item.date),
        items: []
      })
    }

    monthGroup.days.get(item.date).items.push(item)
  })

  return [...monthMap.values()]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map(monthGroup => ({
      monthKey: monthGroup.monthKey,
      monthLabel: monthGroup.monthLabel,
      days: [...monthGroup.days.values()].sort((a, b) => new Date(b.date) - new Date(a.date))
    }))
})

function formatDay(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })
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

function formatSignedAmount(amount) {
  return `${props.amountPrefix}${formatCurrency(amount)}`
}
</script>

<template>
  <div>
    <section v-for="month in groupedSections" :key="month.monthKey" class="space-y-4">
      <h3 class="px-4 text-sm font-medium text-zinc-500">{{ month.monthLabel }}</h3>

      <div class="space-y-4 px-4">
        <section v-for="day in month.days" :key="day.date" class="space-y-3">
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">{{ day.dayLabel }}</p>

          <div class="space-y-3">
            <div
              v-for="item in day.items"
              :key="item.id"
              class="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3"
            >
              <div v-if="isBulkMode" class="mr-2">
                <input
                  type="checkbox"
                  :checked="selectedItems.includes(item.id)"
                  @change="emit('toggleSelect', item.id)"
                  class="h-4 w-4 rounded border-zinc-600 bg-zinc-800"
                  :class="type === 'income' ? 'text-emerald-500' : 'text-red-500'"
                />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between">
                  <p class="truncate font-medium text-zinc-100">{{ getItemName(item) }}</p>
                  <p class="ml-2 whitespace-nowrap font-medium" :class="type === 'income' ? 'text-emerald-400' : amountColor">
                    {{ formatSignedAmount(item.amount) }}
                  </p>
                </div>
                <div class="mt-1 flex items-center justify-between">
                  <p class="text-xs text-zinc-500">{{ getCategoryName(item) }}</p>
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
        </section>
      </div>
    </section>
  </div>
</template>
