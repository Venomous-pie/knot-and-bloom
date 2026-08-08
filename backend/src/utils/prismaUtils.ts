import { loadEnv } from '../config/env.js';

loadEnv();

import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 50,                        // Max connections to allow under load
    min: 5,                         // Maintain a few open connections
    idleTimeoutMillis: 60000,       // Keep idle connections alive longer (was 30s)
    connectionTimeoutMillis: 10000, // Bumped to 10s to handle Supabase cold-start wake-up (was 5s)
})

// ── Keepalive Ping ──────────────────────────────────────────────────────────
// Supabase free tier auto-pauses compute after ~5 minutes of inactivity.
// The first request after a pause has to "wake" the DB (3–8s), which blows
// past any reasonable connectionTimeoutMillis. Pinging every 4 minutes keeps
// the compute warm and prevents cold-start timeouts.
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
setInterval(async () => {
    try {
        await pool.query('SELECT 1');
    } catch (err) {
        console.warn('[keepalive] DB ping failed:', (err as Error).message);
    }
}, KEEPALIVE_INTERVAL_MS);

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma