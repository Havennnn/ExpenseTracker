<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ReportSkeleton from '../components/ReportSkeleton.vue'
import { getExpenses, getIncomes } from '../lib/db'
import { formatCurrency } from '../lib/utils'

const userId = localStorage.getItem('userId')
const REPORT_CACHE_PREFIX = userId ? `reports:${userId}` : 'reports'
const activeSection = ref('monthly')
const isMonthlyLoading = ref(true)
const isForecastLoading = ref(true)
const reportMonth = ref(new Date().toISOString().slice(0, 7))
const expenses = ref([])
const incomes = ref([])
const forecastExpenses = ref([])
const forecastIncomes = ref([])

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
const currentDate = computed(() => new Date())
const forecastMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
})
const totalForecastExpenses = computed(() => forecastExpenses.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const totalForecastIncome = computed(() => forecastIncomes.value.reduce((sum, item) => sum + Number(item.amount || 0), 0))
const currentBalance = computed(() => totalForecastIncome.value - totalForecastExpenses.value)
const daysElapsed = computed(() => currentDate.value.getDate())
const daysInMonth = computed(() => new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 0).getDate())
const daysRemaining = computed(() => Math.max(daysInMonth.value - daysElapsed.value, 0))
const averageDailyExpense = computed(() => totalForecastExpenses.value / Math.max(daysElapsed.value, 1))
const projectedMonthExpense = computed(() => averageDailyExpense.value * daysInMonth.value)
const projectedRemainingExpense = computed(() => averageDailyExpense.value * daysRemaining.value)
const projectedEndBalance = computed(() => totalForecastIncome.value - projectedMonthExpense.value)
const willFinishPositive = computed(() => projectedEndBalance.value >= 0)

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

function getMonthlyCacheKey(monthValue) {
  return `${REPORT_CACHE_PREFIX}:monthly:${monthValue}`
}

function getForecastCacheKey() {
  const monthValue = new Date().toISOString().slice(0, 7)
  return `${REPORT_CACHE_PREFIX}:forecast:${monthValue}`
}

function readCache(key) {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch (error) {
    sessionStorage.removeItem(key)
    return null
  }
}

function writeCache(key, payload) {
  sessionStorage.setItem(key, JSON.stringify(payload))
}

async function loadReport() {
  const cacheKey = getMonthlyCacheKey(reportMonth.value)
  const cached = readCache(cacheKey)
  if (cached) {
    expenses.value = cached.expenses || []
    incomes.value = cached.incomes || []
    isMonthlyLoading.value = false
  } else {
    isMonthlyLoading.value = true
  }

  try {
    const { start, end } = getMonthRange(reportMonth.value)
    const [expenseItems, incomeItems] = await Promise.all([
      fetchAllPages(getExpenses, start, end),
      fetchAllPages(getIncomes, start, end)
    ])

    expenses.value = expenseItems
    incomes.value = incomeItems
    writeCache(cacheKey, {
      expenses: expenseItems,
      incomes: incomeItems
    })
  } catch (e) {
    console.error('Error loading report:', e)
    if (!cached) {
      expenses.value = []
      incomes.value = []
    }
  } finally {
    isMonthlyLoading.value = false
  }
}

async function loadForecast() {
  const cacheKey = getForecastCacheKey()
  const cached = readCache(cacheKey)
  if (cached) {
    forecastExpenses.value = cached.expenses || []
    forecastIncomes.value = cached.incomes || []
    isForecastLoading.value = false
  } else {
    isForecastLoading.value = true
  }

  try {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { start, end } = getMonthRange(currentMonth)
    const [expenseItems, incomeItems] = await Promise.all([
      fetchAllPages(getExpenses, start, end),
      fetchAllPages(getIncomes, start, end)
    ])

    forecastExpenses.value = expenseItems
    forecastIncomes.value = incomeItems
    writeCache(cacheKey, {
      expenses: expenseItems,
      incomes: incomeItems
    })
  } catch (e) {
    console.error('Error loading forecast:', e)
    if (!cached) {
      forecastExpenses.value = []
      forecastIncomes.value = []
    }
  } finally {
    isForecastLoading.value = false
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

onMounted(() => {
  loadReport()
  loadForecast()
})
watch(reportMonth, loadReport)
</script>

<template>
  <div class="pb-24">
    <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div class="max-w-sm mx-auto px-4 py-3">
        <div>
          <h1 class="text-xl font-semibold text-zinc-100">Reports</h1>
          <p class="text-xs text-zinc-500">Insights and outlook</p>
        </div>
      </div>
    </header>

    <main class="max-w-sm mx-auto py-4 px-4 space-y-4">
      <section class="space-y-3">
        <div class="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
          <button
            @click="activeSection = 'monthly'"
            class="h-10 rounded-xl text-sm font-medium transition-colors"
            :class="activeSection === 'monthly' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Monthly Reports
          </button>
          <button
            @click="activeSection = 'forecast'"
            class="h-10 rounded-xl text-sm font-medium transition-colors"
            :class="activeSection === 'forecast' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
          >
            This Month Forecast
          </button>
        </div>

        <div v-if="activeSection === 'monthly'" class="flex items-center justify-between gap-3">
          <input
            v-model="reportMonth"
            type="month"
            class="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm"
          />
          <button
            @click="exportCsv"
            :disabled="!hasData || isMonthlyLoading"
            class="h-10 shrink-0 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
            Export CSV
          </button>
        </div>
      </section>

      <div v-if="activeSection === 'monthly' && isMonthlyLoading">
        <ReportSkeleton />
      </div>
      <div v-else-if="activeSection === 'forecast' && isForecastLoading">
        <ReportSkeleton />
      </div>

      <template v-else-if="activeSection === 'monthly'">
        <div class="bg-zinc-900 border border-zinc-800 rounded-[1.75rem] p-5 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-zinc-500 text-sm">{{ monthLabel }}</p>
              <p class="text-3xl font-semibold" :class="netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'">
                {{ formatCurrency(netBalance) }}
              </p>
              <p class="text-zinc-500 text-xs">Net balance</p>
            </div>
            <span class="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
              {{ hasData ? 'Active month data' : 'No entries yet' }}
            </span>
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

      <template v-else>
        <div class="bg-zinc-900 border border-zinc-800 rounded-[1.75rem] p-5 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-zinc-500 text-sm">{{ forecastMonthLabel }}</p>
              <p class="text-3xl font-semibold" :class="willFinishPositive ? 'text-emerald-400' : 'text-red-400'">
                {{ willFinishPositive ? 'On track' : 'Needs attention' }}
              </p>
              <p class="text-zinc-500 text-xs">Projection based on your current month activity</p>
            </div>
            <span class="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs" :class="willFinishPositive ? 'text-emerald-400' : 'text-red-400'">
              {{ daysRemaining }} days left
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Current balance</p>
              <p class="text-xl font-semibold text-zinc-100">{{ formatCurrency(currentBalance) }}</p>
            </div>
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Projected month end</p>
              <p class="text-xl font-semibold" :class="projectedEndBalance >= 0 ? 'text-emerald-400' : 'text-red-400'">{{ formatCurrency(projectedEndBalance) }}</p>
            </div>
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Average daily expense</p>
              <p class="text-xl font-semibold text-red-400">{{ formatCurrency(averageDailyExpense) }}</p>
            </div>
            <div class="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <p class="text-zinc-500 text-xs">Projected remaining spend</p>
              <p class="text-xl font-semibold text-red-400">{{ formatCurrency(projectedRemainingExpense) }}</p>
            </div>
          </div>
        </div>

        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-zinc-400">Forecast Details</h2>
            <span class="text-xs text-zinc-600">{{ daysElapsed }} of {{ daysInMonth }} days</span>
          </div>
          <div class="space-y-3">
            <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p class="text-zinc-100 font-medium">Income logged so far</p>
                <p class="text-zinc-500 text-xs mt-1">{{ forecastIncomes.length }} entries</p>
              </div>
              <p class="text-emerald-400 font-medium">{{ formatCurrency(totalForecastIncome) }}</p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p class="text-zinc-100 font-medium">Expenses logged so far</p>
                <p class="text-zinc-500 text-xs mt-1">{{ forecastExpenses.length }} entries</p>
              </div>
              <p class="text-red-400 font-medium">{{ formatCurrency(totalForecastExpenses) }}</p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p class="text-zinc-100 font-medium">Projected total expense</p>
                <p class="text-zinc-500 text-xs mt-1">If current pace continues</p>
              </div>
              <p class="text-red-400 font-medium">{{ formatCurrency(projectedMonthExpense) }}</p>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
