import crypto from 'crypto';

/**
 * In-memory refresh token store.
 * 
 * ⚠️ PRODUCTION NOTE: Replace with Redis or a database table for
 * multi-instance deployments. In-memory storage is lost on restart
 * and doesn't work with horizontal scaling.
 * 
 * Each refresh token maps to: { userId, role, expiresAt }
 */

interface RefreshTokenEntry {
    userId: number;
    email?: string;
    role: string;
    sellerId?: number;
    sellerStatus?: string;
    expiresAt: number;
}

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const tokenStore = new Map<string, RefreshTokenEntry>();

// Clean up expired tokens every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, entry] of tokenStore) {
        if (entry.expiresAt < now) tokenStore.delete(token);
    }
}, 30 * 60 * 1000);

export const RefreshTokenService = {
    /**
     * Generate a new refresh token and store it.
     */
    generate(payload: Omit<RefreshTokenEntry, 'expiresAt'>): string {
        const token = crypto.randomBytes(48).toString('hex');
        tokenStore.set(token, {
            ...payload,
            expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
        });
        return token;
    },

    /**
     * Validate and consume a refresh token.
     * Returns the stored payload if valid, null otherwise.
     * The old token is deleted (rotation: caller must issue a new one).
     */
    validate(token: string): Omit<RefreshTokenEntry, 'expiresAt'> | null {
        const entry = tokenStore.get(token);
        if (!entry) return null;

        // Delete the used token (rotation — prevents reuse)
        tokenStore.delete(token);

        if (entry.expiresAt < Date.now()) return null;

        const { expiresAt, ...payload } = entry;
        return payload;
    },

    /**
     * Revoke a specific refresh token (logout).
     */
    revoke(token: string): boolean {
        return tokenStore.delete(token);
    },

    /**
     * Revoke all refresh tokens for a user (password change, account compromise).
     */
    revokeAllForUser(userId: number): number {
        let count = 0;
        for (const [token, entry] of tokenStore) {
            if (entry.userId === userId) {
                tokenStore.delete(token);
                count++;
            }
        }
        return count;
    },
};

export default RefreshTokenService;
