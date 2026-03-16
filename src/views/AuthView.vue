<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isDemoMode, login, register } from '../lib/db'

const router = useRouter()
const isLoading = ref(false)
const error = ref('')
const mode = ref('login')

const email = ref('')
const password = ref('')
const name = ref('')

const isAuthenticated = computed(() => !!localStorage.getItem('userId'))

async function handleSubmit() {
  error.value = ''
  isLoading.value = true
  
  try {
    // Check if API is available
    const demo = await isDemoMode()
    
    if (demo) {
      // Demo mode - simulate auth
      if (mode.value === 'register') {
        if (localStorage.getItem('user_' + email.value)) {
          error.value = 'Email already registered'
          isLoading.value = false
          return
        }
        const userId = 'demo_' + Date.now()
        localStorage.setItem('userId', userId)
        localStorage.setItem('userEmail', email.value)
        localStorage.setItem('userName', name.value || 'Demo User')
      } else {
        const userId = localStorage.getItem('userId') || 'demo_' + Date.now()
        localStorage.setItem('userId', userId)
        localStorage.setItem('userEmail', email.value)
        localStorage.setItem('userName', 'Demo User')
      }
      router.push('/')
      isLoading.value = false
      return
    }
    
    // Real API
    if (mode.value === 'register') {
      const result = await register(email.value, password.value, name.value)
      if (result.error) {
        error.value = result.error
        isLoading.value = false
        return
      }
      localStorage.setItem('userId', result.user.id)
      localStorage.setItem('userEmail', result.user.email)
      localStorage.setItem('userName', result.user.name)
      router.push('/')
    } else {
      const result = await login(email.value, password.value)
      if (result.error) {
        error.value = result.error
        isLoading.value = false
        return
      }
      localStorage.setItem('userId', result.user.id)
      localStorage.setItem('userEmail', result.user.email)
      localStorage.setItem('userName', result.user.name)
      router.push('/')
    }
  } catch (e) {
    console.error('Auth error:', e)
    error.value = 'Authentication failed. Using demo mode.'
    // Fallback to demo mode
    const userId = 'demo_' + Date.now()
    localStorage.setItem('userId', userId)
    localStorage.setItem('userEmail', email.value)
    localStorage.setItem('userName', name.value || 'Demo User')
    router.push('/')
  } finally {
    isLoading.value = false
  }
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">💰 Expense Tracker</h1>
        <p class="text-slate-400">{{ mode === 'login' ? 'Welcome back!' : 'Create your account' }}</p>
      </div>
      
      <Card class="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle class="text-white text-xl">
            {{ mode === 'login' ? 'Sign In' : 'Sign Up' }}
          </CardTitle>
          <CardDescription class="text-slate-400">
            {{ mode === 'login' 
              ? 'Enter your credentials to access your expenses' 
              : 'Start tracking your expenses today' 
            }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="mode === 'register'" class="space-y-2">
              <Label for="name" class="text-slate-300">Name</Label>
              <Input 
                id="name" 
                v-model="name" 
                type="text" 
                placeholder="John Doe"
                required
                class="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:ring-emerald-500"
              />
            </div>
            
            <div class="space-y-2">
              <Label for="email" class="text-slate-300">Email</Label>
              <Input 
                id="email" 
                v-model="email" 
                type="email" 
                placeholder="you@example.com"
                required
                class="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:ring-emerald-500"
              />
            </div>
            
            <div class="space-y-2">
              <Label for="password" class="text-slate-300">Password</Label>
              <Input 
                id="password" 
                v-model="password" 
                type="password" 
                placeholder="••••••••"
                required
                minlength="4"
                class="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:ring-emerald-500"
              />
            </div>
            
            <div v-if="error" class="text-red-400 text-sm text-center py-2">
              {{ error }}
            </div>
            
            <Button 
              type="submit" 
              class="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              :disabled="isLoading"
            >
              <span v-if="isLoading">Loading...</span>
              <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
            </Button>
          </form>
          
          <div class="mt-6 text-center">
            <button 
              @click="toggleMode"
              class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {{ mode === 'login' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in' 
              }}
            </button>
          </div>
        </CardContent>
      </Card>
      
      <p class="text-center text-slate-500 text-xs mt-6">
        Free tier • MySQL Database
      </p>
    </div>
  </div>
</template>
