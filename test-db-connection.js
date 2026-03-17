#!/usr/bin/env node

/**
 * Database Connection Diagnostics
 * Run this to test your Aiven connection and see detailed error info
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

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
  
  return null
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

async function diagnose() {
  console.log('🔍 Database Connection Diagnostics\n')
  console.log('=' .repeat(50))

  const dbUrl = getDbUrl()
  console.log('\n1️⃣  Configuration Check:')
  console.log(`   - MYSQL_URL present: ${!!process.env.MYSQL_URL}`)
  console.log(`   - MYSQL_SSL_MODE: ${process.env.MYSQL_SSL_MODE || 'not set'}`)
  console.log(`   - MYSQL_SSL_CA present: ${!!process.env.MYSQL_SSL_CA}`)

  if (!dbUrl) {
    console.error('\n❌ ERROR: No database URL configured')
    console.log('   Set MYSQL_URL environment variable')
    process.exit(1)
  }

  const url = new URL(dbUrl)
  console.log(`\n2️⃣  Connection Details:`)
  console.log(`   - Host: ${url.hostname}`)
  console.log(`   - Port: ${url.port || 3306}`)
  console.log(`   - User: ${url.username}`)
  console.log(`   - Database: ${url.pathname.replace(/^\//, '')}`)
  console.log(`   - URL SSL Mode: ${url.searchParams.get('ssl-mode') || 'not in URL'}`)

  const ssl = getDbSslConfig()
  console.log(`\n3️⃣  SSL Configuration:`)
  console.log(`   - SSL enabled: ${!!ssl}`)
  if (ssl) {
    console.log(`   - Reject unauthorized: ${ssl.rejectUnauthorized}`)
    console.log(`   - CA certificate: ${ssl.ca ? 'present' : 'not set'}`)
    if (ssl.ca) {
      console.log(`   - CA cert length: ${ssl.ca.length} bytes`)
      console.log(`   - CA starts with: ${ssl.ca.substring(0, 50)}...`)
    }
  }

  // Remove ssl-mode from URL
  url.searchParams.delete('ssl-mode')
  url.searchParams.delete('sslmode')

  const config = {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
  }

  if (ssl) {
    config.ssl = ssl
  }

  console.log(`\n4️⃣  Final Config (for MySQL2):`)
  console.log(`   - Host: ${config.host}`)
  console.log(`   - Port: ${config.port}`)
  console.log(`   - User: ${config.user}`)
  console.log(`   - DB: ${config.database}`)
  console.log(`   - Has SSL: ${!!config.ssl}`)

  console.log(`\n5️⃣  Testing Connection...\n`)
  
  try {
    const pool = mysql.createPool(config)
    const conn = await pool.getConnection()
    
    const [rows] = await conn.query('SELECT 1 as connected')
    conn.release()
    
    console.log('✅ SUCCESS: Connected to database!')
    console.log(`   - Query result: ${JSON.stringify(rows[0])}`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ CONNECTION FAILED\n')
    console.error(`Error Code: ${error.code}`)
    console.error(`Error Message: ${error.message}`)
    console.error(`\nFull Error:`)
    console.error(error)

    // Provide specific guidance
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 DIAGNOSIS: DNS Resolution Failed')
      console.log('   This means Vercel (or your machine) cannot resolve the hostname.')
      console.log('   Possible causes:')
      console.log('   1. Aiven has IP allowlisting enabled and your IP is not whitelisted')
      console.log('   2. You\'re behind a restrictive firewall')
      console.log('   3. The hostname is incorrect')
      console.log('\n   Solutions:')
      console.log('   1. Check Aiven dashboard → IP allowlist settings')
      console.log('   2. Add your current IP or 0.0.0.0/0 to the allowlist')
      console.log('   3. Or contact Aiven support to whitelist Vercel IPs')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 DIAGNOSIS: Connection Refused')
      console.log('   The host is reachable but rejected the connection.')
      console.log('   Possible causes:')
      console.log('   1. Wrong port number')
      console.log('   2. MySQL service is not running')
      console.log('   3. Firewall is blocking the port')
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('\n💡 DIAGNOSIS: SSL/TLS Handshake Failed')
      console.log('   The SSL certificate configuration might be incorrect.')
      console.log('   Solutions:')
      console.log('   1. Verify MYSQL_SSL_CA is the correct certificate')
      console.log('   2. Check MYSQL_SSL_MODE setting')
      console.log('   3. Try connecting without SSL first (not recommended for Vercel)')
    }

    process.exit(1)
  }
}

diagnose()
