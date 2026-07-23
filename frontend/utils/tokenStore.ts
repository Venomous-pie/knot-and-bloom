/**
 * tokenStore.ts
 *
 * Single source of truth for auth tokens used by BOTH api.ts and AuthContext.
 *
 * Two storage tiers:
 *  - AsyncStorage  → "Remember me" sessions (persisted across app restarts)
 *  - _mem          → "Don't remember me" sessions (cleared when JS runtime dies)
 *
 * api.ts can't import from React context, so this module-level store
 * bridges the gap without any circular dependencies.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// In-memory tier (cleared on cold start / full app close)
// ---------------------------------------------------------------------------
const _mem: { authToken?: string; refreshToken?: string; authUser?: string } = {};

// ---------------------------------------------------------------------------
// Getters — memory first, then AsyncStorage
// ---------------------------------------------------------------------------
export async function getAuthToken(): Promise<string | null> {
    if (_mem.authToken) return _mem.authToken;
    return AsyncStorage.getItem('authToken');
}

export async function getRefreshToken(): Promise<string | null> {
    if (_mem.refreshToken) return _mem.refreshToken;
    return AsyncStorage.getItem('refreshToken');
}

export async function getAuthUser(): Promise<string | null> {
    if (_mem.authUser) return _mem.authUser;
    return AsyncStorage.getItem('authUser');
}

// ---------------------------------------------------------------------------
// Setters — routes to the correct tier based on `persist`
// ---------------------------------------------------------------------------
export async function saveSession(
    authToken: string,
    authUser: string,
    refreshToken?: string,
    persist: boolean = true,
): Promise<void> {
    if (persist) {
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('authUser', authUser);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
        // Clear any stale in-memory session so the two tiers don't conflict
        _mem.authToken = undefined;
        _mem.authUser = undefined;
        _mem.refreshToken = undefined;
    } else {
        _mem.authToken = authToken;
        _mem.authUser = authUser;
        if (refreshToken) _mem.refreshToken = refreshToken;
        // Wipe any stale persisted session
        await AsyncStorage.multiRemove(['authToken', 'authUser', 'refreshToken']);
    }
}

/** Used by the token-refresh interceptor after a silent refresh succeeds. */
export async function updateTokens(authToken: string, refreshToken: string): Promise<void> {
    if (_mem.authToken !== undefined) {
        // Session lives in memory — keep it there
        _mem.authToken = authToken;
        _mem.refreshToken = refreshToken;
    } else {
        // Session lives in AsyncStorage
        await AsyncStorage.setItem('authToken', authToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
    }
}

/** Wipes both tiers completely. Call on logout. */
export async function clearSession(): Promise<void> {
    _mem.authToken = undefined;
    _mem.authUser = undefined;
    _mem.refreshToken = undefined;
    await AsyncStorage.multiRemove(['authToken', 'authUser', 'refreshToken']);
}
