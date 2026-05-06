import type { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import prisma from '../utils/prismaUtils.js';

export class PrismaRateLimitStore implements Store {
    private windowMs!: number;

    public init(options: Options): void {
        this.windowMs = options.windowMs;
        // Optional: Run a cleanup job periodically
        setInterval(() => this.cleanUp(), this.windowMs * 2);
    }

    public async increment(key: string): Promise<ClientRateLimitInfo> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.windowMs);

        // Atomic upsert: increment hits if within window, or reset to 1 if expired
        const record = await prisma.$transaction(async (tx) => {
            let record = await tx.rateLimit.findUnique({ where: { key } });

            if (!record || record.expiresAt < now) {
                // Not found or expired -> create/reset
                record = await tx.rateLimit.upsert({
                    where: { key },
                    update: { hits: 1, expiresAt },
                    create: { key, hits: 1, expiresAt }
                });
            } else {
                // Exists and valid -> increment
                record = await tx.rateLimit.update({
                    where: { key },
                    data: { hits: { increment: 1 } }
                });
            }

            return record;
        });

        return {
            totalHits: record.hits,
            resetTime: record.expiresAt
        };
    }

    public async decrement(key: string): Promise<void> {
        await prisma.rateLimit.updateMany({
            where: { key, hits: { gt: 0 } },
            data: { hits: { decrement: 1 } }
        });
    }

    public async resetKey(key: string): Promise<void> {
        await prisma.rateLimit.deleteMany({ where: { key } });
    }

    public async resetAll(): Promise<void> {
        await prisma.rateLimit.deleteMany({});
    }

    private async cleanUp(): Promise<void> {
        try {
            await prisma.rateLimit.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
        } catch (error) {
            console.error('Rate limit cleanup error:', error);
        }
    }
}
