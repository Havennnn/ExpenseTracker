// Database API client
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function fetchAPI(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const contentType = response.headers.get('content-type') || ''
  const rawBody = await response.text()
  let result = null

  if (rawBody) {
    if (contentType.includes('application/json')) {
      try {
        result = JSON.parse(rawBody)
      } catch (error) {
        throw new Error(`Invalid JSON response from /api/${endpoint}`)
      }
    } else {
      const compactBody = rawBody.trim().slice(0, 160)
      throw new Error(compactBody || `Unexpected response from /api/${endpoint}`)
    }
  }
  
  // Return the result even if it's an error - let the caller handle it
  // This allows proper error messages from the server
  if (!response.ok) {
    throw new Error(result?.error || rawBody.trim() || `API error (${response.status})`)
  }

  if (!result) {
    throw new Error(`Empty response from /api/${endpoint}`)
  }
  
  return result
}

// Auth
export async function register(username, password, name) {
  return fetchAPI('auth', { action: 'register', username, password, name })
}

export async function login(username, password) {
  return fetchAPI('auth', { action: 'login', username, password })
}

// Categories
export async function getCategories(userId, search = '', limit = 20, offset = 0) {
  return fetchAPI('auth', { action: 'getCategories', userId, search, limit, offset })
}

export async function createCategory(userId, name, type, color) {
  return fetchAPI('auth', { action: 'createCategory', userId, categoryName: name, categoryType: type, categoryColor: color })
}

export async function deleteCategory(userId, categoryId) {
  return fetchAPI('auth', { action: 'deleteCategory', userId, categoryId })
}

// Expenses
export async function getExpenses(userId, startDate, endDate, search, limit = 20, offset = 0, categoryId = '') {
  return fetchAPI('auth', { action: 'getExpenses', userId, startDate, endDate, search, limit, offset, categoryId })
}

export async function addExpense(userId, categoryId, description, amount, date) {
  return fetchAPI('auth', { action: 'addExpense', userId, categoryId, description, amount, date })
}

export async function deleteExpense(userId, expenseId) {
  return fetchAPI('auth', { action: 'deleteExpense', userId, expenseId })
}

// Incomes
export async function getIncomes(userId, startDate, endDate, search, limit = 20, offset = 0, categoryId = '') {
  return fetchAPI('auth', { action: 'getIncomes', userId, startDate, endDate, search, limit, offset, categoryId })
}

export async function addIncome(userId, categoryId, source, amount, date) {
  return fetchAPI('auth', { action: 'addIncome', userId, categoryId, source, amount, date })
}

export async function deleteIncome(userId, incomeId) {
  return fetchAPI('auth', { action: 'deleteIncome', userId, incomeId })
}

// Plan
export async function getPlan(userId, startDate = null, endDate = null, customDates = null) {
  return fetchAPI('auth', { action: 'getPlan', userId, startDate, endDate, customDates })
}

export async function savePlan(userId, targetSavingsPercent, startDate = null, endDate = null, customDates = null, planType = 'default') {
  return fetchAPI('auth', { action: 'savePlan', userId, targetSavingsPercent, startDate, endDate, customDates, planType })
}

export async function resetPlan(userId) {
  return fetchAPI('auth', { action: 'resetPlan', userId })
}

export async function getPrediction(userId) {
  return fetchAPI('auth', { action: 'predict15Days', userId })
}

// Dashboard
export async function getDashboard(userId) {
  return fetchAPI('auth', { action: 'getDashboard', userId })
}
