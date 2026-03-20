<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import HomeSkeleton from '../components/HomeSkeleton.vue'
import { getDashboard } from '../lib/db'
import { formatCurrency } from '../lib/utils'

const router = useRouter()
const userId = localStorage.getItem('userId')
const username = localStorage.getItem('username') || 'User'
const DASHBOARD_CACHE_KEY = userId ? `dashboard:${userId}` : 'dashboard'

const ExpensesView = defineAsyncComponent(() => import('./ExpensesView.vue'))
const IncomeView = defineAsyncComponent(() => import('./IncomeView.vue'))
const PlanView = defineAsyncComponent(() => import('./PlanView.vue'))
const CategoriesView = defineAsyncComponent(() => import('./CategoriesView.vue'))
const ReportsView = defineAsyncComponent(() => import('./ReportsView.vue'))

const activeTab = ref('home')
const dashboard = ref(null)
const isLoading = ref(true)
const refreshTrigger = ref(0)

const isPositive = computed(() => {
  return dashboard.value?.balance >= 0
})

const groupedRecentTransactions = computed(() => {
  const transactions = dashboard.value?.recentTransactions || []
  const monthMap = new Map()

  transactions.forEach(txn => {
    const monthKey = txn.date.slice(0, 7)
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        monthLabel: formatMonth(txn.date),
        days: new Map()
      })
    }

    const monthGroup = monthMap.get(monthKey)
    if (!monthGroup.days.has(txn.date)) {
      monthGroup.days.set(txn.date, {
        date: txn.date,
        dayLabel: formatDay(txn.date),
        items: []
      })
    }

    monthGroup.days.get(txn.date).items.push(txn)
  })

  return [...monthMap.values()]
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
    .map(monthGroup => ({
      monthKey: monthGroup.monthKey,
      monthLabel: monthGroup.monthLabel,
      days: [...monthGroup.days.values()].sort((a, b) => new Date(b.date) - new Date(a.date))
    }))
})

const activeTabComponent = computed(() => {
  if (activeTab.value === 'expenses') return ExpensesView
  if (activeTab.value === 'income') return IncomeView
  if (activeTab.value === 'plan') return PlanView
  if (activeTab.value === 'categories') return CategoriesView
  if (activeTab.value === 'reports') return ReportsView
  return null
})

async function loadDashboard() {
  isLoading.value = !dashboard.value

  try {
    const result = await getDashboard(userId)
    dashboard.value = result
    sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(result))
  } catch (e) {
    console.error('Error:', e)
  } finally {
    isLoading.value = false
  }
}

function handleTabChange(tab) {
  activeTab.value = tab
}

function handleRefresh() {
  refreshTrigger.value++
  loadDashboard()
}

function logout() {
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  router.push('/auth')
}

function formatDay(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })
}

function formatMonth(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

onMounted(() => {
  const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY)
  if (cached) {
    try {
      dashboard.value = JSON.parse(cached)
      isLoading.value = false
    } catch (error) {
      sessionStorage.removeItem(DASHBOARD_CACHE_KEY)
    }
  }

  loadDashboard()
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <div v-if="activeTab === 'home'" class="pb-20">
      <header class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div class="mx-auto flex max-w-sm items-center justify-between px-4 py-4">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Overview</p>
            <h1 class="mt-1 text-lg font-semibold text-zinc-100">{{ username }}</h1>
          </div>
          <button @click="logout" class="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <HomeSkeleton v-if="isLoading" />

      <main v-else class="mx-auto max-w-sm space-y-6 px-4 py-6">
        <section class="space-y-3">
          <p class="text-xs uppercase tracking-[0.18em] text-zinc-500">Current balance</p>
          <p class="text-4xl font-semibold text-zinc-100">
            {{ formatCurrency(dashboard?.balance || 0) }}
          </p>
          <p class="text-sm text-zinc-500">
            {{ isPositive ? 'You saved this month!' : 'You overspent this month' }}
          </p>
        </section>

        <section class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Income</p>
            <p class="text-xl font-semibold text-emerald-400">{{ formatCurrency(dashboard?.totalIncome || 0) }}</p>
          </div>
          <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <p class="text-xs text-zinc-500">Expenses</p>
            <p class="text-xl font-semibold text-red-400">{{ formatCurrency(dashboard?.totalExpenses || 0) }}</p>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-zinc-500">Recent</h2>
            <span class="text-xs text-zinc-600">{{ dashboard?.recentTransactions?.length || 0 }} items</span>
          </div>
          <div class="space-y-4">
            <section v-for="month in groupedRecentTransactions" :key="month.monthKey" class="space-y-4">
              <h3 class="text-sm font-medium text-zinc-500">{{ month.monthLabel }}</h3>

              <div class="space-y-4">
                <section v-for="day in month.days" :key="day.date" class="space-y-3">
                  <p class="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">{{ day.dayLabel }}</p>

                  <div class="space-y-3">
                    <div
                      v-for="txn in day.items"
                      :key="txn.id"
                      class="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center justify-between">
                          <p class="truncate font-medium text-zinc-100">{{ txn.description || txn.source }}</p>
                          <span
                            class="ml-2 whitespace-nowrap font-medium"
                            :class="txn.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'"
                          >
                            {{ txn.type === 'income' ? '+' : '-' }}{{ formatCurrency(txn.amount) }}
                          </span>
                        </div>
                        <div class="mt-1 flex items-center justify-between">
                          <p class="text-xs text-zinc-500">{{ txn.category_name }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </section>
            <div v-if="!groupedRecentTransactions.length" class="rounded-[1.5rem] border border-dashed border-zinc-800 bg-zinc-900/60 px-4 py-10 text-center text-zinc-500">
              No recent transactions
            </div>
          </div>
        </section>
      </main>
    </div>

    <KeepAlive>
      <component
        :is="activeTabComponent"
        v-if="activeTabComponent"
        :key="activeTab"
        :refresh-trigger="refreshTrigger"
        @refresh="handleRefresh"
      />
    </KeepAlive>

    <BottomNav :active-tab="activeTab" @change="handleTabChange" />
  </div>
</template>
