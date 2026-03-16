<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ReportSkeleton from '../components/ReportSkeleton.vue'
import { getExpenses, getIncomes } from '../lib/db'
import { formatCurrency } from '../lib/utils'

const userId = localStorage.getItem('userId')
const isLoading = ref(true)
const reportMonth = ref(new Date().toISOString().slice(0, 7))
const expenses = ref([])
const incomes = ref([])

const monthLabel = computed(() => {
  const [year, month] = reportMonth.value.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
})

const totalExpenses = computed(() => expenses.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const totalIncome = computed(() => incomes.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const netBalance = computed(() => totalIncome.value - totalExpenses.value)
const hasData = computed(() => expenses.value.length > 0 || incomes.value.length > 0)

const expenseBreakdown = computed(() => buildBreakdown(expenses.value))
const incomeBreakdown = computed(() => buildBreakdown(incomes.value))

function getMonthRange(monthValue) {
  const [year, month] = monthValue.split('-').map(Number)
  const start = `${monthValue}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]
  return { start, end }
}

async function fetchAllPages(fetcher, startDate, endDate) {
  const pageSize = 100
  let offset = 0
  let items = []
  let hasMore = true

  while (hasMore) {
    const result = await fetcher(userId, startDate, endDate, '', pageSize, offset)
    const pageItems = result.expenses || result.incomes || []
    items = [...items, ...pageItems]
    hasMore = Boolean(result.hasMore)
    offset += pageSize
  }

  return items
}

function buildBreakdown(items) {
  const map = new Map()

  for (const item of items) {
    const key = item.category_name || 'Other'
    const amount = Number(item.amount || 0)
    const current = map.get(key) || { name: key, total: 0, count: 0 }
    current.total += amount
    current.count += 1
    map.set(key, current)
  }

  return [...map.values()].sort((a, b) => b.total - a.total)
}

async function loadReport() {
  isLoading.value = true

  try {
    const { start, end } = getMonthRange(reportMonth.value)
    const [expenseItems, incomeItems] = await Promise.all([
      fetchAllPages(getExpenses, start, end),
      fetchAllPages(getIncomes, start, end)
    ])

    expenses.value = expenseItems
    incomes.value = incomeItems
  } catch (e) {
    console.error('Error loading report:', e)
    expenses.value = []
    incomes.value = []
  } finally {
    isLoading.value = false
  }
}

function exportCsv() {
  if (!hasData.value) return

  const rows = [
    ['Type', 'Date', 'Category', 'Description', 'Amount'],
    ...expenses.value.map(item => ['Expense', item.date, item.category_name || 'Other', item.description || '', Number(item.amount).toFixed(2)]),
    ...incomes.value.map(item => ['Income', item.date, item.category_name || 'Other', item.source || '', Number(item.amount).toFixed(2)])
  ]

  const csv = rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `report-${reportMonth.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(loadReport)
watch(reportMonth, loadReport)
</script>

<template>
  <div class="pb-24">
    <header class="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div class="max-w-sm mx-auto px-4 py-3 space-y-3">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-zinc-100">Reports</h1>
          <button
            @click="exportCsv"
            :disabled="!hasData || isLoading"
            class="h-8 px-2.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            Export CSV
          </button>
        </div>
        <input
          v-model="reportMonth"
          type="month"
          class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
        />
      </div>
    </header>

    <main class="max-w-sm mx-auto py-4 px-4 space-y-4">
      <div v-if="isLoading">
        <ReportSkeleton />
      </div>

      <template v-else>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div>
            <p class="text-zinc-500 text-sm">{{ monthLabel }}</p>
            <p class="text-3xl font-semibold" :class="netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ formatCurrency(netBalance) }}
            </p>
            <p class="text-zinc-500 text-xs">Net balance</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Income</p>
              <p class="text-xl font-semibold text-emerald-400">{{ formatCurrency(totalIncome) }}</p>
              <p class="text-zinc-600 text-xs mt-1">{{ incomes.length }} entries</p>
            </div>
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Expenses</p>
              <p class="text-xl font-semibold text-red-400">{{ formatCurrency(totalExpenses) }}</p>
              <p class="text-zinc-600 text-xs mt-1">{{ expenses.length }} entries</p>
            </div>
          </div>
        </div>

        <div v-if="!hasData" class="text-center py-10 text-zinc-500">
          No data for this month.
        </div>

        <template v-else>
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-medium text-zinc-400">Expense Breakdown</h2>
              <span class="text-xs text-zinc-600">{{ expenseBreakdown.length }} categories</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="item in expenseBreakdown"
                :key="`expense-${item.name}`"
                class="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
              >
                <div class="flex items-center justify-between">
                  <p class="text-zinc-100 font-medium">{{ item.name }}</p>
                  <p class="text-red-400 font-medium">{{ formatCurrency(item.total) }}</p>
                </div>
                <p class="text-zinc-500 text-xs mt-2">{{ item.count }} transactions</p>
              </div>
            </div>
          </section>

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-medium text-zinc-400">Income Breakdown</h2>
              <span class="text-xs text-zinc-600">{{ incomeBreakdown.length }} categories</span>
            </div>
            <div class="space-y-3">
              <div
                v-for="item in incomeBreakdown"
                :key="`income-${item.name}`"
                class="bg-zinc-900 border border-zinc-800 rounded-lg p-3"
              >
                <div class="flex items-center justify-between">
                  <p class="text-zinc-100 font-medium">{{ item.name }}</p>
                  <p class="text-emerald-400 font-medium">{{ formatCurrency(item.total) }}</p>
                </div>
                <p class="text-zinc-500 text-xs mt-2">{{ item.count }} transactions</p>
              </div>
            </div>
          </section>
        </template>
      </template>
    </main>
  </div>
</template>
