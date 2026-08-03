/**
 * Single source of truth for auth tokens, shared by api.ts and AuthContext.
 *
 * Sessions are stored in one of two tiers, chosen at login via "remember me":
 * - AsyncStorage: persisted across app restarts
 * - _mem: in-memory only, cleared when the JS runtime dies
 *
 * Implemented as a plain module (not React context) so api.ts can read/write
 * tokens without importing React.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const _mem: { authToken?: string; refreshToken?: string; authUser?: string } = {};

/**
 * Returns the current auth token, checking memory before AsyncStorage.
 */
export async function getAuthToken(): Promise<string | null> {
    if (_mem.authToken) return _mem.authToken;
    return AsyncStorage.getItem('authToken');
}

/**
 * Returns the current refresh token, checking memory before AsyncStorage.
 */
export async function getRefreshToken(): Promise<string | null> {
    if (_mem.refreshToken) return _mem.refreshToken;
    return AsyncStorage.getItem('refreshToken');
}

/**
 * Returns the current auth user (JSON string), checking memory before AsyncStorage.
 */
export async function getAuthUser(): Promise<string | null> {
    if (_mem.authUser) return _mem.authUser;
    return AsyncStorage.getItem('authUser');
}

/**
 * Returns whether the active session is in the persisted (AsyncStorage) tier,
 * as opposed to the in-memory tier.
 */
export async function isSessionPersisted(): Promise<boolean> {
    return (await AsyncStorage.getItem('authToken')) !== null;
}

/**
 * Saves a new session to the appropriate tier and clears the other tier,
 * so only one tier is ever active at a time.
 *
 * @param persist - true = AsyncStorage ("remember me"), false = memory only
 */
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

        _mem.authToken = undefined;
        _mem.authUser = undefined;
        _mem.refreshToken = undefined;
    } else {
        _mem.authToken = authToken;
        _mem.authUser = authUser;
        if (refreshToken) _mem.refreshToken = refreshToken;

        await AsyncStorage.multiRemove(['authToken', 'authUser', 'refreshToken']);
    }
}

/**
 * Updates the token pair in place after a silent refresh, writing to
 * whichever tier the current session already lives in.
 */
export async function updateTokens(authToken: string, refreshToken?: string): Promise<void> {
    if (_mem.authToken !== undefined) {
        _mem.authToken = authToken;
        if (refreshToken) _mem.refreshToken = refreshToken;
    } else {
        await AsyncStorage.setItem('authToken', authToken);
        if (refreshToken) await AsyncStorage.setItem('refreshToken', refreshToken);
    }
}

/**
 * Clears the session from both tiers. Call on logout or refresh failure.
 */
export async function clearSession(): Promise<void> {
    try {
        _mem.authToken = undefined;
        _mem.authUser = undefined;
        _mem.refreshToken = undefined;
        await AsyncStorage.multiRemove(['authToken', 'authUser', 'refreshToken']);
    } catch (e) {
        if (__DEV__) console.warn('Failed to clear session from AsyncStorage:', e);
    }
}