<script setup>
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '../components/BottomNav.vue'
import HomeSkeleton from '../components/HomeSkeleton.vue'
import { getDashboard } from '../lib/db'

const router = useRouter()

const ExpensesView = defineAsyncComponent(() => import('./ExpensesView.vue'))
const IncomeView = defineAsyncComponent(() => import('./IncomeView.vue'))
const CategoriesView = defineAsyncComponent(() => import('./CategoriesView.vue'))
const ReportsView = defineAsyncComponent(() => import('./ReportsView.vue'))

const activeTab = ref('home')
const dashboard = ref(null)
const isLoading = ref(true)
const refreshTrigger = ref(0)

const userId = localStorage.getItem('userId')
const username = localStorage.getItem('username') || 'User'

const currentMonth = computed(() => {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const isPositive = computed(() => {
  return dashboard.value?.balance >= 0
})

const activeTabComponent = computed(() => {
  if (activeTab.value === 'expenses') return ExpensesView
  if (activeTab.value === 'income') return IncomeView
  if (activeTab.value === 'categories') return CategoriesView
  if (activeTab.value === 'reports') return ReportsView
  return null
})

async function loadDashboard() {
  isLoading.value = true
  
  try {
    const result = await getDashboard(userId)
    dashboard.value = result
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

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(loadDashboard)
</script>

<template>
  <div class="min-h-screen bg-zinc-950">
    <!-- Home Tab -->
    <div v-if="activeTab === 'home'" class="pb-20">
      <header class="stick top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <div class="max-w-sm mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 class="text-lg font-semibold text-zinc-100">{{ username }}</h1>
            <p class="text-xs text-zinc-500">{{ currentMonth }}</p>
          </div>
          <button @click="logout" class="p-2 text-zinc-500 hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <HomeSkeleton v-if="isLoading" />

      <main v-else class="max-w-sm mx-auto px-4 py-6 space-y-6">
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p class="text-zinc-500 text-sm mb-1">Balance</p>
          <p 
            class="text-4xl font-semibold"
            :class="isPositive ? 'text-emerald-400' : 'text-red-400'"
          >
            ${{ (dashboard?.balance || 0).toFixed(2) }}
          </p>
          <p class="text-zinc-500 text-xs mt-2">
            {{ isPositive ? 'You saved this month!' : 'You overspent this month' }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p class="text-zinc-500 text-xs">Income</p>
            <p class="text-xl font-semibold text-emerald-400">${{ (dashboard?.totalIncome || 0).toFixed(2) }}</p>
          </div>
          <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p class="text-zinc-500 text-xs">Expenses</p>
            <p class="text-xl font-semibold text-red-400">${{ (dashboard?.totalExpenses || 0).toFixed(2) }}</p>
          </div>
        </div>

        <div>
          <h2 class="text-sm font-medium text-zinc-500 mb-3">Recent</h2>
          <div class="space-y-1">
            <div 
              v-for="txn in dashboard?.recentTransactions" 
              :key="txn.id"
              class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center justify-between group"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="text-zinc-100 font-medium truncate">{{ txn.description || txn.source }}</p>
                  <span 
                    class="font-medium ml-2 whitespace-nowrap"
                    :class="txn.type === 'income' ? 'text-emerald-400' : 'text-zinc-100'"
                  >
                    {{ txn.type === 'income' ? '+' : '-' }}${{ Number(txn.amount).toFixed(2) }}
                  </span>
                </div>
                <div class="flex items-center justify-between mt-1">
                  <p class="text-xs text-zinc-500">{{ txn.category_name }} • {{ formatDate(txn.date) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <component
      :is="activeTabComponent"
      v-if="activeTabComponent"
      :refresh-trigger="refreshTrigger"
      @refresh="handleRefresh"
    />

    <!-- Bottom Navigation -->
    <BottomNav :active-tab="activeTab" @change="handleTabChange" />
  </div>
</template>
