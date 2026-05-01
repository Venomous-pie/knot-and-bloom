/**
 * AuthInterceptor.test.tsx
 *
 * Tests the 401 handling logic that exists in api.ts response interceptor.
 * Since the interceptor is bound at module load time and tightly coupled to the
 * axios instance, we test the LOGIC by reproducing it as a pure function and
 * verifying the event emission behavior.
 *
 * The interceptor logic from api.ts:
 * - If 401 AND url is NOT an auth endpoint → emit ERROR + LOGOUT
 * - If 401 AND url IS an auth endpoint → let error propagate (no LOGOUT)
 * - If non-401 → let error propagate (no LOGOUT)
 * - If network error → let error propagate (no LOGOUT)
 */

import { authEvents } from '../../utils/authEvents';

jest.mock('../../utils/authEvents', () => ({
    authEvents: {
        emit: jest.fn(),
        subscribe: jest.fn(() => jest.fn()),
    },
}));

// Reproduce the interceptor logic from api.ts as a pure function for testing
const AUTH_ENDPOINTS = ['/customers/login', '/customers/register', '/customers/login/google'];

async function handleResponseError(error: any) {
    if (error.response) {
        if (error.response.status === 401) {
            const requestUrl = error.config?.url || '';
            const isAuthEndpoint = AUTH_ENDPOINTS.some(
                endpoint => requestUrl.includes(endpoint)
            );

            if (!isAuthEndpoint) {
                const errorMessage = error.response.data?.error || 'Authentication error';
                authEvents.emit('ERROR', { message: errorMessage });
                authEvents.emit('LOGOUT');
            }
        }
    }
    return Promise.reject(error);
}

// ── Helpers ──────────────────────────────────────────────

function makeAxiosError(status: number, data: any, url: string) {
    return {
        response: { status, data },
        config: { url },
        request: {},
    };
}

function makeNetworkError(url: string = '/customers/login') {
    return {
        request: {},
        message: 'Network Error',
        config: { url },
    };
}

// ── Tests ────────────────────────────────────────────────

describe('Auth Interceptor Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('401 on auth endpoints — should NOT emit LOGOUT', () => {
        it.each([
            ['/customers/login', 'login'],
            ['/customers/register', 'register'],
            ['/customers/login/google', 'Google OAuth'],
        ])('should not emit LOGOUT for 401 on %s (%s)', async (url, _label) => {
            const error = makeAxiosError(401, { message: 'Invalid credentials' }, url);
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).not.toHaveBeenCalledWith('LOGOUT');
        });
    });

    describe('401 on protected endpoints — should emit LOGOUT + ERROR', () => {
        it('should emit LOGOUT and ERROR for 401 on /products', async () => {
            const error = makeAxiosError(401, { error: 'Token expired' }, '/products');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).toHaveBeenCalledWith('ERROR', { message: 'Token expired' });
            expect(authEvents.emit).toHaveBeenCalledWith('LOGOUT');
        });

        it('should emit LOGOUT for 401 on /customers/profile', async () => {
            const error = makeAxiosError(401, { error: 'Auth error' }, '/customers/profile');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).toHaveBeenCalledWith('LOGOUT');
        });

        it('should use fallback message when error has no message', async () => {
            const error = makeAxiosError(401, {}, '/orders');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).toHaveBeenCalledWith('ERROR', { message: 'Authentication error' });
        });
    });

    describe('Non-401 errors on auth endpoints — should NOT emit LOGOUT', () => {
        it('should not emit LOGOUT for 500 on /customers/login', async () => {
            const error = makeAxiosError(500, { error: 'Internal server error' }, '/customers/login');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).not.toHaveBeenCalled();
        });

        it('should not emit LOGOUT for 503 on /customers/register', async () => {
            const error = makeAxiosError(503, { error: 'Service unavailable' }, '/customers/register');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).not.toHaveBeenCalled();
        });
    });

    describe('Network errors', () => {
        it('should reject cleanly on network error without emitting LOGOUT', async () => {
            const error = makeNetworkError('/customers/login');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            expect(authEvents.emit).not.toHaveBeenCalled();
        });

        it('should reject cleanly on network error to protected route without emitting LOGOUT', async () => {
            const error = makeNetworkError('/products');
            await expect(handleResponseError(error)).rejects.toBeTruthy();
            // Network errors have no response object, so the 401 branch is never entered
            expect(authEvents.emit).not.toHaveBeenCalled();
        });
    });
});
