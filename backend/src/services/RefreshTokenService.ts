import crypto from 'crypto';
import prisma from '../utils/prismaUtils.js';

interface RefreshTokenEntry {
    userId: number;
    email?: string;
    role: string;
    sellerId?: number;
    sellerStatus?: string;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const RefreshTokenService = {
    /**
     * Generate a new refresh token and store it.
     */
    async generate(payload: RefreshTokenEntry): Promise<string> {
        const token = crypto.randomBytes(48).toString('hex');
        
        await prisma.refreshToken.create({
            data: {
                token,
                userId: payload.userId,
                ...(payload.email && { email: payload.email }),
                role: payload.role,
                ...(payload.sellerId && { sellerId: payload.sellerId }),
                ...(payload.sellerStatus && { sellerStatus: payload.sellerStatus }),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            }
        });
        
        return token;
    },

    /**
     * Validate and consume a refresh token.
     * Returns the stored payload if valid, null otherwise.
     * The old token is deleted (rotation: caller must issue a new one).
     */
    async validate(token: string): Promise<RefreshTokenEntry | null> {
        const entry = await prisma.refreshToken.findUnique({
            where: { token }
        });

        if (!entry) return null;

        // Delete the used token (rotation — prevents reuse)
        await prisma.refreshToken.delete({ where: { uid: entry.uid } });

        if (entry.expiresAt.getTime() < Date.now()) return null;

        return {
            userId: entry.userId,
            ...(entry.email && { email: entry.email }),
            role: entry.role,
            ...(entry.sellerId && { sellerId: entry.sellerId }),
            ...(entry.sellerStatus && { sellerStatus: entry.sellerStatus }),
        };
    },

    /**
     * Revoke a specific refresh token (logout).
     */
    async revoke(token: string): Promise<boolean> {
        try {
            await prisma.refreshToken.delete({ where: { token } });
            return true;
        } catch (e) {
            // Prisma throws if not found, we can just return false
            return false;
        }
    },

    /**
     * Revoke all refresh tokens for a user (password change, account compromise).
     */
    async revokeAllForUser(userId: number): Promise<number> {
        const result = await prisma.refreshToken.deleteMany({
            where: { userId }
        });
        return result.count;
    },
};

export default RefreshTokenService;
