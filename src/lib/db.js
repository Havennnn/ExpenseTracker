// Database API client
const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000'

async function fetchAPI(endpoint, data) {
  const response = await fetch(`${API_URL}/api/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()
  
  // Return the result even if it's an error - let the caller handle it
  // This allows proper error messages from the server
  if (!response.ok) {
    throw new Error(result.error || 'API error')
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
export async function getPlan(userId) {
  return fetchAPI('auth', { action: 'getPlan', userId })
}

export async function savePlan(userId, targetSavingsPercent) {
  return fetchAPI('auth', { action: 'savePlan', userId, targetSavingsPercent })
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
