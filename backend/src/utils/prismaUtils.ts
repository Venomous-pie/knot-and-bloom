import dotenv from 'dotenv';

dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { PrismaClient } from '../../generated/prisma/client.js'
// Client updated

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 50,              // Max connections to allow under load
    min: 5,               // Maintain a few open connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

export default prisma