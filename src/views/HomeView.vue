<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addExpense, deleteExpense, getExpenses, isDemoMode } from '../lib/db'

const router = useRouter()

const expenses = ref([])
const isLoading = ref(true)
const showAddForm = ref(false)
const demoMode = ref(false)

const newExpense = ref({
  description: '',
  amount: '',
  category: 'food'
})

const categories = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'bills', label: 'Bills' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' }
]

const username = ref('')

const totalExpenses = computed(() => {
  return expenses.value.reduce((sum, exp) => sum + Number(exp.amount), 0)
})

const sortedExpenses = computed(() => {
  return [...expenses.value].sort((a, b) => new Date(b.date) - new Date(a.date))
})

async function loadExpenses() {
  const userId = localStorage.getItem('userId')
  if (!userId) {
    router.push('/auth')
    return
  }
  
  isLoading.value = true
  demoMode.value = await isDemoMode()
  
  try {
    if (demoMode.value) {
      const stored = localStorage.getItem('expenses_' + userId)
      if (stored) {
        expenses.value = JSON.parse(stored)
      } else {
        expenses.value = [
          { id: 1, description: 'Coffee', amount: 5.50, category: 'food', date: new Date().toISOString() },
          { id: 2, description: 'Bus fare', amount: 2.00, category: 'transport', date: new Date().toISOString() },
          { id: 3, description: 'Lunch', amount: 12.00, category: 'food', date: new Date().toISOString() }
        ]
      }
    } else {
      const result = await getExpenses(userId)
      expenses.value = result.expenses || []
    }
  } catch (e) {
    console.log('Error loading expenses:', e.message)
    demoMode.value = true
    expenses.value = [
      { id: 1, description: 'Coffee', amount: 5.50, category: 'food', date: new Date().toISOString() },
      { id: 2, description: 'Bus fare', amount: 2.00, category: 'transport', date: new Date().toISOString() }
    ]
  } finally {
    isLoading.value = false
  }
}

async function saveExpense() {
  if (!newExpense.value.description || !newExpense.value.amount) return
  
  const userId = localStorage.getItem('userId')
  
  try {
    if (demoMode.value) {
      const expense = {
        id: Date.now(),
        description: newExpense.value.description,
        amount: Number(newExpense.value.amount),
        category: newExpense.value.category,
        date: new Date().toISOString()
      }
      expenses.value.unshift(expense)
      localStorage.setItem('expenses_' + userId, JSON.stringify(expenses.value))
    } else {
      await addExpense(userId, newExpense.value.description, newExpense.value.amount, newExpense.value.category)
      await loadExpenses()
    }
  } catch (e) {
    console.log('Error saving expense:', e.message)
    const expense = {
      id: Date.now(),
      description: newExpense.value.description,
      amount: Number(newExpense.value.amount),
      category: newExpense.value.category,
      date: new Date().toISOString()
    }
    expenses.value.unshift(expense)
  }
  
  newExpense.value = { description: '', amount: '', category: 'food' }
  showAddForm.value = false
}

async function removeExpense(id) {
  const userId = localStorage.getItem('userId')
  
  try {
    if (!demoMode.value) {
      await deleteExpense(id)
    }
  } catch (e) {
    console.log('Error deleting:', e.message)
  }
  
  expenses.value = expenses.value.filter(exp => exp.id !== id)
  
  if (demoMode.value) {
    localStorage.setItem('expenses_' + userId, JSON.stringify(expenses.value))
  }
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

function getCategoryLabel(category) {
  const cat = categories.find(c => c.value === category)
  return cat ? cat.label : 'Other'
}

onMounted(() => {
  username.value = localStorage.getItem('username') || 'User'
  loadExpenses()
})
</script>

<template>
  <div class="min-h-screen bg-zinc-950 pb-20">
    <header class="stick top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div class="max-w-sm mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-semibold text-zinc-100">Expenses</h1>
            <p class="text-xs text-zinc-500">{{ username }}</p>
          </div>
          <button 
            @click="logout" 
            class="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-sm mx-auto px-4 py-6">
      <div v-if="demoMode" class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-amber-400 text-sm">
        Demo mode - Data in browser only
      </div>

      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <p class="text-zinc-500 text-sm mb-1">Total</p>
        <p class="text-4xl font-semibold text-zinc-100">${{ totalExpenses.toFixed(2) }}</p>
      </div>

      <button 
        @click="showAddForm = !showAddForm"
        class="w-full h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors mb-6"
      >
        <span v-if="!showAddForm">Add Expense</span>
        <span v-else>Cancel</span>
      </button>

      <div v-if="showAddForm" class="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
        <form @submit.prevent="saveExpense" class="space-y-4">
          <div class="space-y-2">
            <label for="desc" class="text-sm font-medium text-zinc-300">Description</label>
            <input 
              id="desc" 
              v-model="newExpense.description" 
              placeholder="What did you buy?"
              required
              class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
          </div>
          <div class="space-y-2">
            <label for="amount" class="text-sm font-medium text-zinc-300">Amount</label>
            <input 
              id="amount" 
              v-model="newExpense.amount" 
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
              class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            />
          </div>
          <div class="space-y-2">
            <label for="category" class="text-sm font-medium text-zinc-300">Category</label>
            <select 
              id="category"
              v-model="newExpense.category"
              class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <button type="submit" class="w-full h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors">
            Save
          </button>
        </form>
      </div>

      <div class="space-y-2">
        <h2 class="text-sm font-medium text-zinc-500 mb-3">Recent</h2>
        
        <div v-if="isLoading" class="text-center py-8 text-zinc-500">
          Loading...
        </div>
        
        <div v-else-if="sortedExpenses.length === 0" class="text-center py-8 text-zinc-500">
          No expenses yet
        </div>
        
        <div 
          v-else 
          v-for="expense in sortedExpenses" 
          :key="expense.id"
          class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
              <span class="text-xs font-medium text-zinc-400">{{ getCategoryLabel(expense.category).charAt(0) }}</span>
            </div>
            <div>
              <p class="text-zinc-100 font-medium">{{ expense.description }}</p>
              <p class="text-xs text-zinc-500">{{ formatDate(expense.date) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-zinc-100 font-medium">${{ Number(expense.amount).toFixed(2) }}</span>
            <button 
              @click="removeExpense(expense.id)"
              class="p-1 text-zinc-600 hover:text-red-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
