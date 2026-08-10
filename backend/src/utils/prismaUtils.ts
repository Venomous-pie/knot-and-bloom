import dotenv from 'dotenv';

dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { PrismaClient } from '../../generated/prisma/client.js'

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma