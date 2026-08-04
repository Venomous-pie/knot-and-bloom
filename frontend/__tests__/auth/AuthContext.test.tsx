import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../../utils/authEvents';

// ── Mocks ────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace }),
    useSegments: () => [],
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    },
}));

jest.mock('../../api/api', () => {
    const mockLogin = jest.fn();
    const mockRegister = jest.fn();
    const mockLoginWithGoogle = jest.fn();
    const mockGet = jest.fn();
    return {
        __esModule: true,
        default: { get: mockGet, interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } },
        authAPI: { login: mockLogin, register: mockRegister, loginWithGoogle: mockLoginWithGoogle },
    };
});

jest.mock('../../utils/authEvents', () => {
    const listeners = new Set<Function>();
    return {
        authEvents: {
            subscribe: jest.fn((fn: Function) => {
                listeners.add(fn);
                return () => listeners.delete(fn);
            }),
            emit: jest.fn((type: string) => {
                listeners.forEach(fn => fn(type));
            }),
            _listeners: listeners,
        },
    };
});

// Import AuthProvider AFTER mocks are set up
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';

// ── Test Consumer ────────────────────────────────────────

function AuthConsumer() {
    const { user, token, loading, login, logout } = useAuth();
    return (
        <>
            <Text testID="loading">{loading ? 'loading' : 'ready'}</Text>
            <Text testID="user">{user ? JSON.stringify(user) : 'null'}</Text>
            <Text testID="token">{token || 'null'}</Text>
            <Pressable testID="login-btn" onPress={() => login({ email: 'test@test.com', password: 'pass123' })} />
            <Pressable testID="logout-btn" onPress={logout} />
        </>
    );
}

// ── Fixtures ─────────────────────────────────────────────

const mockUser = {
    uid: 1,
    name: 'Test User',
    email: 'test@test.com',
    role: 'USER',
};

const mockToken = 'jwt-token-abc123';

// ── Tests ────────────────────────────────────────────────

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    });

    describe('Token Storage', () => {
        it('should store JWT and user in AsyncStorage after successful login', async () => {
            (authAPI.login as jest.Mock).mockResolvedValueOnce({
                data: { token: mockToken, customer: mockUser },
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            // Wait for loadUser to finish (AsyncStorage returns null by default)
            await waitFor(() => expect(getByTestId('loading').props.children).toBe('ready'));

            await act(async () => {
                fireEvent.press(getByTestId('login-btn'));
            });

            await waitFor(() => {
                expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', mockToken);
                expect(AsyncStorage.setItem).toHaveBeenCalledWith('authUser', JSON.stringify(mockUser));
            });
        });

        it('should clear both token and user from AsyncStorage on logout', async () => {
            // Pre-seed storage so loadUser populates state
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'authToken') return Promise.resolve(mockToken);
                if (key === 'authUser') return Promise.resolve(JSON.stringify(mockUser));
                return Promise.resolve(null);
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => expect(getByTestId('user').props.children).not.toBe('null'));

            await act(async () => {
                fireEvent.press(getByTestId('logout-btn'));
            });

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authUser');

            await waitFor(() => {
                expect(getByTestId('user').props.children).toBe('null');
                expect(getByTestId('token').props.children).toBe('null');
            });
        });
    });

    describe('Session Rehydration', () => {
        it('should rehydrate user and token from AsyncStorage on mount', async () => {
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'authToken') return Promise.resolve(mockToken);
                if (key === 'authUser') return Promise.resolve(JSON.stringify(mockUser));
                return Promise.resolve(null);
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => {
                expect(getByTestId('loading').props.children).toBe('ready');
                expect(getByTestId('token').props.children).toBe(mockToken);
                expect(JSON.parse(getByTestId('user').props.children)).toEqual(mockUser);
            });
        });

        it('should treat malformed JSON in AsyncStorage as unauthenticated without crashing', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'authToken') return Promise.resolve(mockToken);
                if (key === 'authUser') return Promise.resolve('{corrupt-json');
                return Promise.resolve(null);
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => {
                expect(getByTestId('loading').props.children).toBe('ready');
                // User should remain null — the JSON.parse throws, caught by try/catch
                expect(getByTestId('user').props.children).toBe('null');
            }, { timeout: 10000 });

            consoleErrorSpy.mockRestore();
        });

        it('should treat token-without-user as unauthenticated', async () => {
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'authToken') return Promise.resolve(mockToken);
                if (key === 'authUser') return Promise.resolve(null);
                return Promise.resolve(null);
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => {
                expect(getByTestId('loading').props.children).toBe('ready');
                expect(getByTestId('user').props.children).toBe('null');
            });
        });

        it('should not crash when AsyncStorage throws on mount (device permission issue)', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage permission denied'));

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => {
                expect(getByTestId('loading').props.children).toBe('ready');
                expect(getByTestId('user').props.children).toBe('null');
            });

            // Should not have crashed — loading resolved to false
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Auth Events', () => {
        it('should trigger full logout when authEvents emits LOGOUT', async () => {
            // Pre-seed storage
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
                if (key === 'authToken') return Promise.resolve(mockToken);
                if (key === 'authUser') return Promise.resolve(JSON.stringify(mockUser));
                return Promise.resolve(null);
            });

            const { getByTestId } = render(
                <AuthProvider><AuthConsumer /></AuthProvider>
            );

            await waitFor(() => expect(getByTestId('user').props.children).not.toBe('null'));

            // Simulate an external LOGOUT event (e.g. from API interceptor)
            await act(async () => {
                authEvents.emit('LOGOUT');
            });

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authUser');

            await waitFor(() => {
                expect(getByTestId('user').props.children).toBe('null');
            });

            expect(mockReplace).toHaveBeenCalledWith('/auth/login');
        });
    });
});
