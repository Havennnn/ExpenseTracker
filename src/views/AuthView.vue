<script setup>
import { kv } from '@vercel/kv'
import { sql } from '@vercel/postgres'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

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
    if (mode.value === 'register') {
      // Check if user exists
      const { rows } = await sql`
        SELECT id FROM users WHERE email = ${email.value}
      `
      
      if (rows.length > 0) {
        error.value = 'Email already registered'
        isLoading.value = false
        return
      }
      
      // Create new user
      const result = await sql`
        INSERT INTO users (email, password_hash, name)
        VALUES (${email.value}, ${password.value}, ${name.value})
        RETURNING id, email, name
      `
      
      const user = result.rows[0]
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('userName', user.name)
      
      // Create session in KV (if available)
      try {
        const sessionId = crypto.randomUUID()
        await kv.set(`session:${sessionId}`, user.id, { ex: 60 * 60 * 24 * 7 }) // 7 days
        localStorage.setItem('sessionId', sessionId)
      } catch (e) {
        // KV might not be configured, continue without session
        console.log('KV not configured, using localStorage only')
      }
      
      router.push('/')
    } else {
      // Login
      const { rows } = await sql`
        SELECT id, email, name, password_hash 
        FROM users 
        WHERE email = ${email.value}
      `
      
      if (rows.length === 0) {
        error.value = 'Invalid email or password'
        isLoading.value = false
        return
      }
      
      const user = rows[0]
      
      // Simple password check (in production, use bcrypt)
      if (user.password_hash !== password.value) {
        error.value = 'Invalid email or password'
        isLoading.value = false
        return
      }
      
      localStorage.setItem('userId', user.id)
      localStorage.setItem('userEmail', user.email)
      localStorage.setItem('userName', user.name)
      
      // Create session
      try {
        const sessionId = crypto.randomUUID()
        await kv.set(`session:${sessionId}`, user.id, { ex: 60 * 60 * 24 * 7 })
        localStorage.setItem('sessionId', sessionId)
      } catch (e) {
        console.log('KV not configured')
      }
      
      router.push('/')
    }
  } catch (e) {
    console.error('Auth error:', e)
    error.value = 'Authentication failed. Make sure to set up your database.'
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
      <!-- Logo/Title -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">💰 Expense Tracker</h1>
        <p class="text-slate-400">{{ mode === 'login' ? 'Welcome back!' : 'Create your account' }}</p>
      </div>
      
      <!-- Auth Card -->
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
            <!-- Name (Register only) -->
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
            
            <!-- Email -->
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
            
            <!-- Password -->
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
            
            <!-- Error Message -->
            <div v-if="error" class="text-red-400 text-sm text-center py-2">
              {{ error }}
            </div>
            
            <!-- Submit Button -->
            <Button 
              type="submit" 
              class="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              :disabled="isLoading"
            >
              <span v-if="isLoading">Loading...</span>
              <span v-else>{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
            </Button>
          </form>
          
          <!-- Toggle Mode -->
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
      
      <!-- Footer -->
      <p class="text-center text-slate-500 text-xs mt-6">
        Free tier • Vercel Postgres
      </p>
    </div>
  </div>
</template>
