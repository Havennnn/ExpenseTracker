<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, register } from '../lib/db'

const router = useRouter()
const isLoading = ref(false)
const error = ref('')
const mode = ref('login')
const showPassword = ref(false)

const username = ref('')
const password = ref('')

async function handleSubmit() {
  error.value = ''
  
  if (!username.value.trim()) {
    error.value = 'Username is required'
    return
  }
  
  if (!password.value.trim()) {
    error.value = 'Password is required'
    return
  }
  
  if (password.value.length < 4) {
    error.value = 'Password must be at least 4 characters'
    return
  }
  
  isLoading.value = true
  
  try {
    if (mode.value === 'register') {
      await register(username.value, password.value, username.value)
      mode.value = 'login'
      error.value = ''
      username.value = ''
      password.value = ''
      showPassword.value = false
      alert('Account created! Please log in.')
      isLoading.value = false
      return
    }
    
    const result = await login(username.value, password.value)
    localStorage.setItem('userId', result.user.id)
    localStorage.setItem('username', result.user.name || result.user.username)
    router.push('/')
  } catch (e) {
    console.error('Auth error:', e)
    const errorMessage = e.message || 'Connection failed'
    
    if (errorMessage.includes('username')) {
      error.value = 'Username does not exist'
    } else if (errorMessage.includes('password')) {
      error.value = 'Incorrect password'
    } else if (errorMessage.includes('ENOTFOUND')) {
      error.value = 'Database host could not be reached. Check your Vercel database host settings.'
    } else if (errorMessage.includes('ECONNREFUSED')) {
      error.value = 'Database connection was refused. Check host, port, and SSL settings.'
    } else if (errorMessage.includes('Database setup failed')) {
      error.value = 'Database connection worked, but schema setup failed.'
    } else {
      error.value = errorMessage
    }
  } finally {
    isLoading.value = false
  }
}

function setMode(nextMode) {
  mode.value = nextMode
  error.value = ''
  showPassword.value = false
}

function toggleMode() {
  setMode(mode.value === 'login' ? 'register' : 'login')
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 px-4 pt-8">
    <div class="mx-auto flex min-h-screen w-full max-w-sm flex-col">
      <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <section class="w-full rounded-[2rem] border border-zinc-800 bg-zinc-900 p-6 shadow-2xl md:p-8">
        <div class="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          <button
            @click="setMode('login')"
            class="h-10 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'login' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Sign in
          </button>
          <button
            @click="setMode('register')"
            class="h-10 rounded-lg text-sm font-medium transition-colors"
            :class="mode === 'register' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'"
          >
            Sign up
          </button>
        </div>

        <div class="mt-8">
          <h2 class="text-2xl font-semibold text-zinc-100">
            {{ mode === 'login' ? 'Welcome back' : 'Create your account' }}
          </h2>
          <p class="mt-2 text-sm text-zinc-500">
            {{ mode === 'login' ? 'Enter your details below to sign in.' : 'Fill in the details below to register.' }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="mt-8 space-y-4">
              <div class="space-y-2">
                <label for="username" class="text-sm font-medium text-zinc-300">Username</label>
                <input 
                  id="username" 
                  v-model="username" 
                  type="text" 
                  :placeholder="mode === 'login' ? 'Enter your username' : 'Choose a username'"
                  required
                  class="w-full h-11 px-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                />
              </div>
              
              <div class="space-y-2">
                <label for="password" class="text-sm font-medium text-zinc-300">Password</label>
                <div class="relative">
                  <input 
                    id="password" 
                    v-model="password" 
                    :type="showPassword ? 'text' : 'password'"
                    :placeholder="mode === 'login' ? 'Enter your password' : 'Create a password'"
                    required
                    minlength="4"
                    class="w-full h-11 px-3 pr-11 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    @click="showPassword = !showPassword"
                    class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  >
                    <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-10-7 1.01-3.029 5-7 10-7 1.042 0 2.043.154 2.986.44M6.228 6.228A9.965 9.965 0 002 12c1 3 5 7 10 7 1.517 0 2.956-.37 4.228-1.028M9.88 9.88a3 3 0 104.24 4.24M3 3l18 18" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.27 2.943 9.542 7-1.273 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                <p v-if="mode === 'register'" class="text-xs text-zinc-500">
                  Passwords must be at least 4 characters.
                </p>
              </div>
              
              <div v-if="error" class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm text-center">
                {{ error }}
              </div>
              
              <button 
                type="submit" 
                class="w-full h-11 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isLoading"
              >
                <span v-if="isLoading">Loading...</span>
                <span v-else>{{ mode === 'login' ? 'Sign in' : 'Create account' }}</span>
              </button>
        </form>

        <div class="mt-6 text-center">
          <button 
            @click="toggleMode"
            class="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {{ mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in' }}
          </button>
        </div>
        </section>
      </div>

      <footer class="flex items-center justify-center gap-3 py-6 text-zinc-500">
        <svg width="22" height="20" viewBox="0 0 228 208" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="shrink-0">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M4 0H49.2851V157.529H62.4429V0H107.728V2.47824L109.697 4.72678L118.245 14.1732L135.342 33.0661L142.748 41.2503L149.02 34.5093L167.004 15.1805L175.996 5.51614L178.715 2.35488V0H224V200H178.715V65.6093L146.004 98.7138L141.693 103.818L107.728 67.7988V157.529H166.36V200L107.728 200H62.4429H4V157.529V0Z" fill="white"/>
        </svg>
        <span class="text-sm font-medium tracking-[0.12em] text-zinc-400">LatsMarbls</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
input[type='password']::-ms-reveal,
input[type='password']::-ms-clear {
  display: none;
}
</style>
