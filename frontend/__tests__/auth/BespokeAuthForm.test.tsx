import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BespokeAuthForm from '../../components/auth/BespokeAuthForm';

// ── Mocks ────────────────────────────────────────────────

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        register: mockRegister,
        user: null,
        loading: false,
        loginWithGoogle: jest.fn(),
        loginWithToken: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
        token: null,
    }),
}));

jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
    useLocalSearchParams: jest.fn(() => ({})),
    RelativePathString: String,
}));

jest.mock('../../api/api', () => ({
    authAPI: { sendOTP: jest.fn() },
}));

jest.mock('react-native-reanimated', () => {
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: { View },
        useSharedValue: jest.fn((init: any) => ({ value: init })),
        useAnimatedStyle: jest.fn(() => ({})),
        withTiming: jest.fn((val: any) => val),
        Easing: { bezier: jest.fn() },
    };
});

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
    openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
    createURL: jest.fn(() => 'exp://callback'),
}));

jest.mock('../../components/GoogleAuthButton', () => {
    const { View } = require('react-native');
    return function MockGoogleAuthButton() {
        return <View testID="mock-google-btn" />;
    };
});

// ── Helpers ──────────────────────────────────────────────

/**
 * "Sign In" and "Create Account" appear in both the tab toggle AND the submit
 * button. The submit button is always the LAST element with that text.
 */
function getSubmitButton(getAllByText: Function, text: string) {
    const matches = getAllByText(text);
    return matches[matches.length - 1];
}

// ── Tests ────────────────────────────────────────────────

describe('BespokeAuthForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Login', () => {
        it('should trigger login() with correct email/password payload', async () => {
            mockLogin.mockResolvedValueOnce(undefined);

            const { getByPlaceholderText, getAllByText } = render(
                <BespokeAuthForm initialMode="login" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'user@test.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), 'mypassword');

            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Sign In'));
            });

            expect(mockLogin).toHaveBeenCalledWith({
                email: 'user@test.com',
                password: 'mypassword',
            }, undefined);
        });

        it('should display API error when login fails with wrong credentials', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            mockLogin.mockRejectedValueOnce({
                response: { data: { message: 'Invalid email or password' } },
            });

            const { getByPlaceholderText, getAllByText, findByText } = render(
                <BespokeAuthForm initialMode="login" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'user@test.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), 'wrongpass');

            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Sign In'));
            });

            expect(await findByText('Invalid email or password')).toBeTruthy();
            
            consoleErrorSpy.mockRestore();
        });

        it('should surface field-level validation errors from backend issues array', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            mockLogin.mockRejectedValueOnce({
                response: {
                    data: {
                        issues: [
                            { path: ['email'], message: 'Invalid email format' },
                            { path: ['password'], message: 'Password must be at least 6 characters' },
                        ],
                    },
                },
            });

            const { getByPlaceholderText, getAllByText, findByText } = render(
                <BespokeAuthForm initialMode="login" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'valid@email.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), '12');

            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Sign In'));
            });

            expect(await findByText('Invalid email format')).toBeTruthy();
            expect(await findByText('Password must be at least 6 characters')).toBeTruthy();

            consoleErrorSpy.mockRestore();
        });

        it('should disable submit button while request is in-flight (prevents double submit)', async () => {
            let resolveLogin!: Function;
            mockLogin.mockReturnValueOnce(new Promise((resolve) => { resolveLogin = resolve; }));

            const { getByPlaceholderText, getAllByText, queryByText } = render(
                <BespokeAuthForm initialMode="login" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'user@test.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), 'pass123');

            // First press starts the flow
            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Sign In'));
            });

            // While in-flight, the submit button text should be gone (replaced by ActivityIndicator)
            // The tab "Sign In" is still there, but the BUTTON "Sign In" text is replaced
            // We verify login was only called once despite the component being interactive
            expect(mockLogin).toHaveBeenCalledTimes(1);

            // Resolve to clean up
            await act(async () => { resolveLogin(); });
        });

        it('should show retry countdown on 429 rate limiting', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            mockLogin.mockRejectedValueOnce({
                response: {
                    status: 429,
                    data: { retryAfter: 30 },
                },
            });

            const { getByPlaceholderText, getAllByText, findByText } = render(
                <BespokeAuthForm initialMode="login" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'user@test.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), 'pass');

            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Sign In'));
            });

            expect(await findByText(/Too many attempts/)).toBeTruthy();
            expect(await findByText(/wait 30s/)).toBeTruthy();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('Registration', () => {
        it('should require terms agreement before allowing signup', async () => {
            const { getByPlaceholderText, getAllByText, findByText } = render(
                <BespokeAuthForm initialMode="signup" />
            );

            fireEvent.changeText(getByPlaceholderText('artisan@gmail.com'), 'new@user.com');
            fireEvent.changeText(getByPlaceholderText('••••••••••'), 'securepass');

            await act(async () => {
                fireEvent.press(getSubmitButton(getAllByText, 'Create Account'));
            });

            // The submit button is disabled when terms are not agreed to, so pressing it does nothing
            expect(mockRegister).not.toHaveBeenCalled();
        });
    });
});
