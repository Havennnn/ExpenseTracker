import mysql from 'mysql2/promise'

let pool = null
let schemaReady = false
let lastPoolError = ''
const REQUIRED_TABLES = ['users', 'categories', 'expenses', 'incomes', 'plans']

function getDbUrl() {
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL
  }
  
  if (process.env.DB_CONNECTION === 'mysql' && process.env.DB_HOST) {
    const user = process.env.DB_USERNAME || 'root'
    const pass = process.env.DB_PASSWORD || ''
    const host = process.env.DB_HOST || '127.0.0.1'
    const port = process.env.DB_PORT || 3306
    const db = process.env.DB_DATABASE || 'expense'
    return `mysql://${user}:${pass}@${host}:${port}/${db}`
  }
  
  return (
    process.env.DATABASE_URL ||
    process.env.JAWSDB_URL ||
    null
  )
}

function getDbSslConfig() {
  const sslMode = String(process.env.MYSQL_SSL_MODE || '').toLowerCase()
  const sslCa = process.env.MYSQL_SSL_CA || process.env.MYSQL_SSL_CA_BASE64
  const isBase64 = Boolean(process.env.MYSQL_SSL_CA_BASE64 && !process.env.MYSQL_SSL_CA)

  if (!sslMode && !sslCa) {
    return undefined
  }

  if (sslMode === 'disabled' || sslMode === 'off' || sslMode === 'false') {
    return undefined
  }

  const ssl = {
    rejectUnauthorized: sslMode !== 'required_no_verify'
  }

  if (sslCa) {
    ssl.ca = isBase64 ? Buffer.from(sslCa, 'base64').toString('utf8') : sslCa
  }

  return ssl
}

function parseSslMode(value = '') {
  const normalized = String(value || '').toLowerCase()
  if (!normalized || normalized === 'disabled' || normalized === 'off' || normalized === 'false') {
    return undefined
  }

  return {
    rejectUnauthorized: normalized !== 'required_no_verify' && normalized !== 'preferred'
  }
}

function getDbConfig() {
  const dbUrl = getDbUrl()
  if (!dbUrl) return null

  const url = new URL(dbUrl)
  
  // Remove ssl-mode from URL params to avoid MySQL2 warnings
  url.searchParams.delete('ssl-mode')
  url.searchParams.delete('sslmode')
  
  const envSsl = getDbSslConfig()
  const ssl = envSsl || undefined

  const config = {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }

  // Add SSL config if available
  if (ssl) {
    config.ssl = ssl
  }

  return config
}

async function getPool() {
  if (pool) return pool

  const dbConfig = getDbConfig()
  if (!dbConfig) return null

  try {
    pool = mysql.createPool(dbConfig)
    const connection = await pool.getConnection()
    connection.release()
    lastPoolError = ''
    return pool
  } catch (error) {
    lastPoolError = error.message
    console.error('MySQL connection failed:', error.message)
    return null
  }
}

async function ensureIndex(p, tableName, indexName, definition) {
  const [rows] = await p.query(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND index_name = ?
     LIMIT 1`,
    [tableName, indexName]
  )

  if (rows.length === 0) {
    await p.query(`CREATE INDEX ${indexName} ON ${tableName} ${definition}`)
  }
}

async function setupDatabase() {
  const p = await getPool()
  if (!p) return false
  
  try {
    // Users table
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Categories table
    await p.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
        color VARCHAR(20) DEFAULT '#6366f1',
        icon VARCHAR(50) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Expenses table
    await p.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `)

    // Income table
    await p.query(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        source VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `)

    await p.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        target_savings_percent DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    await ensureIndex(p, 'categories', 'idx_categories_user_type_name', '(user_id, type, name)')
    await ensureIndex(p, 'categories', 'idx_categories_user_name', '(user_id, name)')
    await ensureIndex(p, 'expenses', 'idx_expenses_user_date_created', '(user_id, date, created_at)')
    await ensureIndex(p, 'expenses', 'idx_expenses_user_category', '(user_id, category_id)')
    await ensureIndex(p, 'incomes', 'idx_incomes_user_date_created', '(user_id, date, created_at)')
    await ensureIndex(p, 'incomes', 'idx_incomes_user_category', '(user_id, category_id)')
    await ensureIndex(p, 'plans', 'idx_plans_user_id', '(user_id)')

    return true
  } catch (error) {
    console.error('Setup error:', error.message)
    return false
  }
}

async function ensureSchema(p) {
  if (schemaReady) return true

  const [rows] = await p.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN (?)`,
    [REQUIRED_TABLES]
  )

  const existingTables = new Set(rows.map(row => row.table_name))
  const isSchemaComplete = REQUIRED_TABLES.every(tableName => existingTables.has(tableName))

  if (!isSchemaComplete) {
    const setupSucceeded = await setupDatabase()
    if (!setupSucceeded) {
      return false
    }
  }

  schemaReady = true
  return true
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action, userId, username, password, name, categoryId, categoryName, categoryType, categoryColor, source, amount, description, date, startDate, endDate, search, targetSavingsPercent } = req.body

  const p = await getPool()

  // Setup action - creates tables if they don't exist
  if (action === 'setup') {
    const success = await setupDatabase()
    if (success) {
      return res.status(200).json({ success: true, message: 'Database setup complete' })
    }
    return res.status(500).json({ error: `Setup failed: ${lastPoolError}` })
  }

  if (!p) {
    const errorMsg = lastPoolError || 'Database not configured'
    console.error('Pool error:', errorMsg)
    return res.status(500).json({ error: `Database error: ${errorMsg}` })
  }

  try {
    const schemaAvailable = await ensureSchema(p)
    if (!schemaAvailable) {
      return res.status(500).json({ error: 'Database setup failed' })
    }

    function getCycleRange(now = new Date()) {
      const year = now.getFullYear()
      const month = now.getMonth()
      const day = now.getDate()
      const cycleStartDay = day <= 15 ? 1 : 16
      const cycleEndDay = day <= 15 ? 15 : new Date(year, month + 1, 0).getDate()

      const cycleStart = new Date(year, month, cycleStartDay)
      const cycleEnd = new Date(year, month, cycleEndDay)
      const fullCycleDays = cycleEndDay - cycleStartDay + 1
      const daysElapsed = day - cycleStartDay + 1
      const daysRemaining = Math.max(cycleEndDay - day, 0)
      const daysLeft = Math.max(cycleEndDay - day + 1, 1)

      return {
        cycleLabel: `${cycleStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        cycleName: cycleStartDay === 1 ? 'Cycle 1' : 'Cycle 2',
        budgetLabel: cycleStartDay === 1 ? `Budget until ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : `Budget until ${cycleEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        cycleStart: cycleStart.toISOString().split('T')[0],
        cycleEnd: cycleEnd.toISOString().split('T')[0],
        cycleStartDay,
        cycleEndDay,
        fullCycleDays,
        daysElapsed,
        daysRemaining,
        daysLeft
      }
    }

    // ============ AUTH ============
    if (action === 'register') {
      const [rows] = await p.query('SELECT id FROM users WHERE username = ?', [username])
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Username already taken' })
      }

      const [result] = await p.query(
        'INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)',
        [username, password, name || username]
      )

      // Create default categories for new user
      const userId = result.insertId
      await p.query(
        `INSERT INTO categories (user_id, name, type, color) VALUES 
        (?, 'Food', 'expense', '#ef4444'),
        (?, 'Transport', 'expense', '#f97316'),
        (?, 'Shopping', 'expense', '#eab308'),
        (?, 'Bills', 'expense', '#22c55e'),
        (?, 'Entertainment', 'expense', '#06b6d4'),
        (?, 'Health', 'expense', '#8b5cf6'),
        (?, 'Other', 'expense', '#6b7280'),
        (?, 'Salary', 'income', '#22c55e'),
        (?, 'Side Income', 'income', '#06b6d4'),
        (?, 'Investment', 'income', '#8b5cf6'),
        (?, 'Other', 'income', '#6b7280')`,
        [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
      )

      return res.status(200).json({
        user: { id: result.insertId, username, name: name || username }
      })
    }

    if (action === 'login') {
      const [rows] = await p.query(
        'SELECT id, username, name, password_hash FROM users WHERE username = ?',
        [username]
      )

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Username does not exist' })
      }

      const user = rows[0]
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Incorrect password' })
      }

      return res.status(200).json({
        user: { id: user.id, username: user.username, name: user.name }
      })
    }

    // ============ CATEGORIES ============
    if (action === 'getCategories') {
      const limit = parseInt(req.body.limit) || 20
      const offset = parseInt(req.body.offset) || 0
      const search = req.body.search || ''
      
      let query = 'SELECT * FROM categories WHERE user_id = ?'
      const params = [userId]
      
      if (search) {
        query += ' AND name LIKE ?'
        params.push(`%${search}%`)
      }
      
      query += ' ORDER BY type, name LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const [rows] = await p.query(query, params)
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM categories WHERE user_id = ?'
      const countParams = [userId]
      if (search) {
        countQuery += ' AND name LIKE ?'
        countParams.push(`%${search}%`)
      }
      const [countResult] = await p.query(countQuery, countParams)
      
      return res.status(200).json({ 
        categories: rows,
        total: countResult[0].total,
        hasMore: offset + rows.length < countResult[0].total
      })
    }

    if (action === 'createCategory') {
      const [result] = await p.query(
        'INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)',
        [userId, categoryName, categoryType || 'expense', categoryColor || '#6366f1']
      )
      return res.status(200).json({ 
        category: { id: result.insertId, name: categoryName, type: categoryType, color: categoryColor }
      })
    }

    if (action === 'deleteCategory') {
      await p.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [categoryId, userId])
      return res.status(200).json({ success: true })
    }

    // ============ EXPENSES ============
    if (action === 'getExpenses') {
      const limit = parseInt(req.body.limit) || 20
      const offset = parseInt(req.body.offset) || 0
      const selectedCategoryId = Number(req.body.categoryId) || 0
      let query = 'SELECT e.*, c.name as category_name, c.color as category_color FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.user_id = ?'
      const params = [userId]

      if (startDate && endDate) {
        query += ' AND e.date BETWEEN ? AND ?'
        params.push(startDate, endDate)
      }

      if (search) {
        query += ' AND e.description LIKE ?'
        params.push(`%${search}%`)
      }

      if (selectedCategoryId > 0) {
        query += ' AND e.category_id = ?'
        params.push(selectedCategoryId)
      }

      query += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const [rows] = await p.query(query, params)

      let countQuery = 'SELECT COUNT(*) as total FROM expenses e WHERE e.user_id = ?'
      const countParams = [userId]

      if (startDate && endDate) {
        countQuery += ' AND e.date BETWEEN ? AND ?'
        countParams.push(startDate, endDate)
      }

      if (search) {
        countQuery += ' AND e.description LIKE ?'
        countParams.push(`%${search}%`)
      }

      if (selectedCategoryId > 0) {
        countQuery += ' AND e.category_id = ?'
        countParams.push(selectedCategoryId)
      }

      const [countResult] = await p.query(countQuery, countParams)

      return res.status(200).json({
        expenses: rows,
        total: countResult[0].total,
        hasMore: offset + rows.length < countResult[0].total
      })
    }

    if (action === 'addExpense') {
      await p.query(
        'INSERT INTO expenses (user_id, category_id, description, amount, date) VALUES (?, ?, ?, ?, ?)',
        [userId, categoryId || null, description, amount, date || new Date().toISOString().split('T')[0]]
      )
      return res.status(200).json({ success: true })
    }

    if (action === 'deleteExpense') {
      await p.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [req.body.expenseId, userId])
      return res.status(200).json({ success: true })
    }

    // ============ INCOMES ============
    if (action === 'getIncomes') {
      const limit = parseInt(req.body.limit) || 20
      const offset = parseInt(req.body.offset) || 0
      const selectedCategoryId = Number(req.body.categoryId) || 0
      let query = 'SELECT i.*, c.name as category_name, c.color as category_color FROM incomes i LEFT JOIN categories c ON i.category_id = c.id WHERE i.user_id = ?'
      const params = [userId]

      if (startDate && endDate) {
        query += ' AND i.date BETWEEN ? AND ?'
        params.push(startDate, endDate)
      }

      if (search) {
        query += ' AND i.source LIKE ?'
        params.push(`%${search}%`)
      }

      if (selectedCategoryId > 0) {
        query += ' AND i.category_id = ?'
        params.push(selectedCategoryId)
      }

      query += ' ORDER BY i.date DESC, i.created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const [rows] = await p.query(query, params)

      let countQuery = 'SELECT COUNT(*) as total FROM incomes i WHERE i.user_id = ?'
      const countParams = [userId]

      if (startDate && endDate) {
        countQuery += ' AND i.date BETWEEN ? AND ?'
        countParams.push(startDate, endDate)
      }

      if (search) {
        countQuery += ' AND i.source LIKE ?'
        countParams.push(`%${search}%`)
      }

      if (selectedCategoryId > 0) {
        countQuery += ' AND i.category_id = ?'
        countParams.push(selectedCategoryId)
      }

      const [countResult] = await p.query(countQuery, countParams)

      return res.status(200).json({
        incomes: rows,
        total: countResult[0].total,
        hasMore: offset + rows.length < countResult[0].total
      })
    }

    if (action === 'addIncome') {
      const selectedCategoryId = Number(categoryId)
      const normalizedAmount = Number(amount)
      const normalizedSource = String(source || '').trim()
      const normalizedDate = date || new Date().toISOString().split('T')[0]

      if (!userId || !selectedCategoryId || !normalizedSource || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid income data' })
      }

      const [categoryRows] = await p.query(
        'SELECT id, name, color FROM categories WHERE id = ? AND user_id = ? AND type = ? LIMIT 1',
        [selectedCategoryId, userId, 'income']
      )

      if (categoryRows.length === 0) {
        return res.status(400).json({ error: 'Invalid income category' })
      }

      const [result] = await p.query(
        'INSERT INTO incomes (user_id, category_id, source, amount, date) VALUES (?, ?, ?, ?, ?)',
        [userId, selectedCategoryId, normalizedSource, normalizedAmount, normalizedDate]
      )

      return res.status(200).json({
        success: true,
        income: {
          id: result.insertId,
          source: normalizedSource,
          amount: normalizedAmount,
          category_id: selectedCategoryId,
          category_name: categoryRows[0].name,
          category_color: categoryRows[0].color,
          date: normalizedDate
        }
      })
    }

    if (action === 'deleteIncome') {
      await p.query('DELETE FROM incomes WHERE id = ? AND user_id = ?', [req.body.incomeId, userId])
      return res.status(200).json({ success: true })
    }

    // ============ PLAN ============
    if (action === 'savePlan') {
      const normalizedPercent = Number(targetSavingsPercent)

      if (!userId || !Number.isFinite(normalizedPercent) || normalizedPercent < 0 || normalizedPercent > 100) {
        return res.status(400).json({ error: 'Invalid plan data' })
      }

      await p.query(
        `INSERT INTO plans (user_id, target_savings_percent)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
           target_savings_percent = VALUES(target_savings_percent),
           updated_at = CURRENT_TIMESTAMP`,
        [userId, normalizedPercent]
      )

      return res.status(200).json({ success: true })
    }

    if (action === 'resetPlan') {
      await p.query('DELETE FROM plans WHERE user_id = ?', [userId])
      return res.status(200).json({ success: true })
    }

    if (action === 'getPlan') {
      const [planRows] = await p.query(
        'SELECT target_savings_percent FROM plans WHERE user_id = ? LIMIT 1',
        [userId]
      )

      const cycle = getCycleRange()

      const [[balanceExpenses], [balanceIncome], [cycleExpenseRows]] = await Promise.all([
        p.query(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ?',
          [userId]
        ),
        p.query(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM incomes WHERE user_id = ?',
          [userId]
        ),
        p.query(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
          [userId, cycle.cycleStart, cycle.cycleEnd]
        )
      ])

      const totalExpenses = Number(balanceExpenses[0]?.total || 0)
      const totalIncome = Number(balanceIncome[0]?.total || 0)
      const currentBalance = totalIncome - totalExpenses

      if (planRows.length === 0) {
        return res.status(200).json({
          planExists: false,
          cycle,
          currentBalance,
          suggestedPercent: 20
        })
      }

      const targetSavingsPercent = Number(planRows[0].target_savings_percent || 0)
      const targetSavingsAmount = currentBalance > 0
        ? currentBalance * (targetSavingsPercent / 100)
        : 0
      const spendableAmount = currentBalance - targetSavingsAmount
      const cycleExpenses = Number(cycleExpenseRows[0]?.total || 0)
      const remainingBudget = spendableAmount - cycleExpenses
      const dailyBudget = remainingBudget / Math.max(cycle.daysLeft, 1)

      const status = remainingBudget < 0
        ? 'over_budget'
        : dailyBudget > 0
          ? 'on_track'
          : 'no_budget'

      const message = currentBalance <= 0
        ? 'Your current balance is zero or below, so this plan is very tight.'
        : remainingBudget < 0
          ? `You are over this plan by ${Math.abs(remainingBudget).toFixed(2)} for the current window.`
          : `Spend up to ${dailyBudget.toFixed(2)} per day until ${cycle.cycleEndDay}.`

      return res.status(200).json({
        planExists: true,
        cycle,
        currentBalance,
        targetSavingsPercent,
        targetSavingsAmount,
        spendableAmount,
        cycleExpenses,
        remainingBudget,
        dailyBudget,
        status,
        message
      })
    }

    // ============ DASHBOARD ============
    if (action === 'getDashboard') {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      // Total expenses this month
      const [expenseRows] = await p.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
        [userId, firstDayOfMonth, lastDayOfMonth]
      )

      // Total income this month
      const [incomeRows] = await p.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND date BETWEEN ? AND ?',
        [userId, firstDayOfMonth, lastDayOfMonth]
      )

      // Recent transactions
      const [recentExpenses] = await p.query(
        "SELECT e.*, c.name as category_name, c.color as category_color, 'expense' as type FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE e.user_id = ? ORDER BY e.date DESC, e.created_at DESC LIMIT 8",
        [userId]
      )

      const [recentIncomes] = await p.query(
        "SELECT i.*, c.name as category_name, c.color as category_color, 'income' as type FROM incomes i LEFT JOIN categories c ON i.category_id = c.id WHERE i.user_id = ? ORDER BY i.date DESC, i.created_at DESC LIMIT 8",
        [userId]
      )

      const recentTransactions = [...recentExpenses, ...recentIncomes]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)

      return res.status(200).json({
        totalExpenses: parseFloat(expenseRows[0].total || 0),
        totalIncome: parseFloat(incomeRows[0].total || 0),
        balance: parseFloat(incomeRows[0].total || 0) - parseFloat(expenseRows[0].total || 0),
        recentTransactions
      })
    }

     // ============ PREDICTION ============
     if (action === 'predict15Days') {
       const now = new Date()
       const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
       const today = now.toISOString().split('T')[0]

       // Get total expenses and income from first day of month to today
       const [expenseResult] = await p.query(
         'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ?',
         [userId, firstDayOfMonth, today]
       )
       const [incomeResult] = await p.query(
         'SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND date BETWEEN ? AND ?',
         [userId, firstDayOfMonth, today]
       )

       const totalExpensesSoFar = parseFloat(expenseResult[0].total) || 0
       const totalIncomeSoFar = parseFloat(incomeResult[0].total) || 0
       const currentBalance = totalIncomeSoFar - totalExpensesSoFar

       // Calculate days elapsed in current month
       const daysElapsed = now.getDate() // 1-based day of month
       let averageDailyExpense = 0
       if (daysElapsed > 0) {
         averageDailyExpense = totalExpensesSoFar / daysElapsed
       }

       const projected15DayExpense = averageDailyExpense * 15
       const willLast = currentBalance >= projected15DayExpense

       return res.status(200).json({
         willLast,
         currentBalance,
         projected15DayExpense,
         averageDailyExpense,
         daysElapsed,
         totalExpensesSoFar,
         totalIncomeSoFar
       })
     }

     return res.status(400).json({ error: 'Unknown action' })
   } catch (error) {
     console.error('Database error:', error)
     const errorMsg = error.code === 'ENOTFOUND' 
       ? `Cannot resolve database host: ${error.hostname}. Check your MYSQL_URL environment variable and ensure the host is accessible.`
       : error.message
     return res.status(500).json({ error: errorMsg })
   }
 }
