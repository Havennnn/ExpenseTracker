import mysql from 'mysql2/promise'

let pool = null

function getDbUrl() {
  // Check for MYSQL_URL
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL
  }
  
  // Laravel-style DB_* variables
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
    process.env.CLEARDB_DATABASE_URL ||
    null
  )
}

async function getPool() {
  if (pool) return pool

  const dbUrl = getDbUrl()
  if (!dbUrl) return null

  try {
    pool = mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
    const connection = await pool.getConnection()
    connection.release()
    return pool
  } catch (error) {
    console.error('MySQL connection failed:', error.message)
    return null
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { action, userId, email, password, name, expenseId, description, amount, category } = req.body

  const p = await getPool()

  if (!p) {
    return res.status(500).json({ error: 'Database not configured' })
  }

  try {
    if (action === 'register') {
      // Check if user exists
      const [rows] = await p.query('SELECT id FROM users WHERE email = ?', [email])
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' })
      }

      // Create new user
      const [result] = await p.query(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
        [email, password, name]
      )

      return res.status(200).json({
        user: { id: result.insertId, email, name }
      })
    }

    if (action === 'login') {
      const [rows] = await p.query(
        'SELECT id, email, name, password_hash FROM users WHERE email = ?',
        [email]
      )

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      const user = rows[0]
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      return res.status(200).json({
        user: { id: user.id, email: user.email, name: user.name }
      })
    }

    if (action === 'getExpenses') {
      const [rows] = await p.query(
        'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
        [userId]
      )
      return res.status(200).json({ expenses: rows })
    }

    if (action === 'addExpense') {
      await p.query(
        'INSERT INTO expenses (user_id, description, amount, category, date) VALUES (?, ?, ?, ?, NOW())',
        [userId, description, amount, category]
      )
      return res.status(200).json({ success: true })
    }

    if (action === 'deleteExpense') {
      await p.query('DELETE FROM expenses WHERE id = ?', [expenseId])
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (error) {
    console.error('Database error:', error)
    return res.status(500).json({ error: error.message })
  }
}
