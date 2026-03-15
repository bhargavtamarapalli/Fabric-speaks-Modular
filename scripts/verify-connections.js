const { Pool } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

console.log('--- DB Connection Debugger ---');
console.log('PID:', process.pid);
console.log('Time:', new Date().toISOString());

async function verifyConnections() {
  console.log('--- Supabase Connection Verification ---');

  // 1. Verify Postgres (Supabase)
  if (process.env.DATABASE_URL) {
    console.log('Checking Supabase (Postgres)...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('✅ Supabase Connection Successful! Server time:', res.rows[0].now);
    } catch (err) {
      console.error('❌ Supabase Connection Failed:', err.message);
    } finally {
      await pool.end();
    }
  } else {
    console.log('\n⚠️ Skipping Supabase: DATABASE_URL not found in .env');
  }

  // 2. Verify Redis (Upstash)
  if (process.env.REDIS_URL) {
    console.log('\nChecking Upstash (Redis)...');
    const redis = new Redis(process.env.REDIS_URL, {
      tls: { rejectUnauthorized: false },
      lazyConnect: true
    });
    try {
      await redis.connect();
      const ping = await redis.ping();
      console.log('✅ Upstash Connection Successful! PING ->', ping);
    } catch (err) {
      console.error('❌ Upstash Connection Failed:', err.message);
    } finally {
      await redis.quit();
    }
  } else {
    console.log('\n⚠️ Skipping Upstash: REDIS_URL not found in .env');
  }
}

verifyConnections().catch(err => {
  console.error('Fatal Error during verification:', err);
});
