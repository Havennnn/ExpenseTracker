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
  { value: 'food', label: '🍔 Food' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'bills', label: '📄 Bills' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'health', label: '💊 Health' },
  { value: 'other', label: '📦 Other' }
]

const userName = ref('')
const userEmail = ref('')

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
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userName')
  localStorage.removeItem('sessionId')
  router.push('/auth')
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getCategoryIcon(category) {
  const cat = categories.find(c => c.value === category)
  return cat ? cat.label : '📦 Other'
}

onMounted(() => {
  userName.value = localStorage.getItem('userName') || 'User'
  userEmail.value = localStorage.getItem('userEmail') || ''
  loadExpenses()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
    <header class="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
      <div class="max-w-md mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-white">💰 Expenses</h1>
            <p class="text-xs text-slate-400">{{ userEmail }}</p>
          </div>
          <Button 
            @click="logout" 
            variant="ghost" 
            size="sm"
            class="text-slate-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
            </svg>
          </Button>
        </div>
      </div>
    </header>

    <main class="max-w-md mx-auto px-4 py-6">
      <div v-if="demoMode" class="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3 mb-4 text-amber-200 text-sm">
        ⚠️ Demo mode - Data stored in browser. Connect a database for persistence.
      </div>

      <Card class="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 mb-6">
        <CardContent class="pt-6">
          <p class="text-emerald-100 text-sm mb-1">Total Expenses</p>
          <p class="text-4xl font-bold text-white">${{ totalExpenses.toFixed(2) }}</p>
        </CardContent>
      </Card>

      <Button 
        @click="showAddForm = !showAddForm"
        class="w-full mb-6 bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <span v-if="!showAddForm">+ Add Expense</span>
        <span v-else>Cancel</span>
      </Button>

      <Card v-if="showAddForm" class="bg-slate-800/50 border-slate-700 mb-6">
        <CardContent class="pt-6">
          <form @submit.prevent="saveExpense" class="space-y-4">
            <div class="space-y-2">
              <Label for="desc" class="text-slate-300">Description</Label>
              <Input 
                id="desc" 
                v-model="newExpense.description" 
                placeholder="What did you buy?"
                required
                class="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div class="space-y-2">
              <Label for="amount" class="text-slate-300">Amount ($)</Label>
              <Input 
                id="amount" 
                v-model="newExpense.amount" 
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
                class="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div class="space-y-2">
              <Label for="category" class="text-slate-300">Category</Label>
              <select 
                id="category"
                v-model="newExpense.category"
                class="w-full h-10 px-3 rounded-md bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </option>
              </select>
            </div>
            <Button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700">
              Save Expense
            </Button>
          </form>
        </CardContent>
      </Card>

      <div class="space-y-3">
        <h2 class="text-lg font-semibold text-white mb-4">Recent</h2>
        
        <div v-if="isLoading" class="text-center py-8 text-slate-400">
          Loading...
        </div>
        
        <div v-else-if="sortedExpenses.length === 0" class="text-center py-8 text-slate-400">
          No expenses yet. Add your first one!
        </div>
        
        <Card 
          v-else 
          v-for="expense in sortedExpenses" 
          :key="expense.id"
          class="bg-slate-800/30 border-slate-700 hover:bg-slate-800/50 transition-colors"
        >
          <CardContent class="flex items-center justify-between py-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ getCategoryIcon(expense.category) }}</span>
              <div>
                <p class="text-white font-medium">{{ expense.description }}</p>
                <p class="text-xs text-slate-400">{{ formatDate(expense.date) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-white font-semibold">${{ Number(expense.amount).toFixed(2) }}</span>
              <button 
                @click="removeExpense(expense.id)"
                class="text-slate-500 hover:text-red-400 transition-colors p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  </div>
</template>
