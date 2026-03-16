// Database API client
// Uses API routes for server-side database access

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000'

async function fetchAPI(endpoint, data) {
  try {
    const response = await fetch(`${API_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'API error')
    }
    
    return result
  } catch (error) {
    console.error('API error:', error)
    throw error
  }
}

// Auth API
export async function register(email, password, name) {
  return fetchAPI('auth', { action: 'register', email, password, name })
}

export async function login(email, password) {
  return fetchAPI('auth', { action: 'login', email, password })
}

// Expenses API
export async function getExpenses(userId) {
  return fetchAPI('auth', { action: 'getExpenses', userId })
}

export async function addExpense(userId, description, amount, category) {
  return fetchAPI('auth', { action: 'addExpense', userId, description, amount, category })
}

export async function deleteExpense(expenseId) {
  return fetchAPI('auth', { action: 'deleteExpense', expenseId })
}

// Check if API is available
export async function isDemoMode() {
  try {
    // Try to call the API - if it fails, we're in demo mode
    await fetch(`${API_URL}/api/auth`, { 
      method: 'POST',
      body: JSON.stringify({ action: 'ping' })
    })
    return false
  } catch (e) {
    // API not available - use demo mode
    return true
  }
}
