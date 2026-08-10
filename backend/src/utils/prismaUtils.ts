import dotenv from 'dotenv';

dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.MAX),                       
    min: Number(process.env.MIN),                         
    idleTimeoutMillis: 60000,       
    connectionTimeoutMillis: 10000, 
})

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
