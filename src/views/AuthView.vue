<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isDemoMode, login, register } from '../lib/db'

const router = useRouter()
const isLoading = ref(false)
const error = ref('')
const mode = ref('login')

const username = ref('')
const password = ref('')

const isAuthenticated = computed(() => !!localStorage.getItem('userId'))

async function handleSubmit() {
  error.value = ''
  isLoading.value = true
  
  try {
    const demo = await isDemoMode()
    
    if (demo) {
      if (mode.value === 'register') {
        if (localStorage.getItem('user_' + username.value)) {
          error.value = 'Username already taken'
          isLoading.value = false
          return
        }
        const userId = 'demo_' + Date.now()
        localStorage.setItem('userId', userId)
        localStorage.setItem('username', username.value)
      } else {
        const userId = localStorage.getItem('userId') || 'demo_' + Date.now()
        localStorage.setItem('userId', userId)
        localStorage.setItem('username', username.value)
      }
      router.push('/')
      isLoading.value = false
      return
    }
    
    if (mode.value === 'register') {
      const result = await register(username.value, password.value, username.value)
      if (result.error) {
        error.value = result.error
        isLoading.value = false
        return
      }
      localStorage.setItem('userId', result.user.id)
      localStorage.setItem('username', result.user.name || username.value)
      router.push('/')
    } else {
      const result = await login(username.value, password.value)
      if (result.error) {
        error.value = result.error
        isLoading.value = false
        return
      }
      localStorage.setItem('userId', result.user.id)
      localStorage.setItem('username', result.user.name || username.value)
      router.push('/')
    }
  } catch (e) {
    console.error('Auth error:', e)
    error.value = 'Authentication failed'
    const userId = 'demo_' + Date.now()
    localStorage.setItem('userId', userId)
    localStorage.setItem('username', username.value)
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
  <div class="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-semibold text-zinc-100">Expense Tracker</h1>
        <p class="text-zinc-500 mt-1 text-sm">{{ mode === 'login' ? 'Welcome back' : 'Create your account' }}</p>
      </div>
      
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 class="text-lg font-medium text-zinc-100 mb-5">
          {{ mode === 'login' ? 'Sign in' : 'Create account' }}
        </h2>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium text-zinc-300">Username</label>
            <input 
              id="username" 
              v-model="username" 
              type="text" 
              placeholder="Enter username"
              required
              class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
            />
          </div>
          
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-zinc-300">Password</label>
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              placeholder="Enter password"
              required
              minlength="4"
              class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
            />
          </div>
          
          <div v-if="error" class="text-red-400 text-sm text-center py-2">
            {{ error }}
          </div>
          
          <button 
            type="submit" 
            class="w-full h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Loading...</span>
            <span v-else>{{ mode === 'login' ? 'Sign in' : 'Create account' }}</span>
          </button>
        </form>
        
        <div class="mt-5 text-center">
          <button 
            @click="toggleMode"
            class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
            <span class="ml-1">{{ mode === 'login' ? 'Sign up' : 'Sign in' }}</span>
          </button>
        </div>
      </div>
      
      <p class="text-center text-zinc-600 text-xs mt-6">
        Made by @LatsMarbls
      </p>
    </div>
  </div>
</template>
