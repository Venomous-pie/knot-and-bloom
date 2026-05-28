interface RefreshTokenEntry {
    userId: number;
    email?: string;
    role: string;
    sellerId?: number;
    sellerStatus?: string;
}
export declare const RefreshTokenService: {
    /**
     * Generate a new refresh token and store it.
     */
    generate(payload: RefreshTokenEntry): Promise<string>;
    /**
     * Validate and consume a refresh token.
     * Returns the stored payload if valid, null otherwise.
     * The old token is deleted (rotation: caller must issue a new one).
     */
    validate(token: string): Promise<RefreshTokenEntry | null>;
    /**
     * Revoke a specific refresh token (logout).
     */
    revoke(token: string): Promise<boolean>;
    /**
     * Revoke all refresh tokens for a user (password change, account compromise).
     */
    revokeAllForUser(userId: number): Promise<number>;
};
export default RefreshTokenService;
//# sourceMappingURL=RefreshTokenService.d.ts.map