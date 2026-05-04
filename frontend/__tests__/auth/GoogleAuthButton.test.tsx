import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';
import * as WebBrowser from 'expo-web-browser';

// ── Mocks ────────────────────────────────────────────────

const mockLoginWithToken = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        loginWithToken: mockLoginWithToken,
        user: null,
        loading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshUser: jest.fn(),
        loginWithGoogle: jest.fn(),
        token: null,
    }),
}));

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
    openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
    createURL: jest.fn(() => 'exp://auth/success'),
}));

jest.mock('expo-router', () => ({
    useLocalSearchParams: jest.fn(() => ({})),
}));

// ── Tests ────────────────────────────────────────────────

describe('GoogleAuthButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should open OAuth session when pressed', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
            type: 'cancel',
        });

        const { getByText } = render(<GoogleAuthButton />);

        await act(async () => {
            fireEvent.press(getByText('Continue with Google'));
        });

        expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
            expect.stringContaining('/auth/google'),
            'exp://auth/success'
        );
    });

    it('should extract token from callback URL and call loginWithToken', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
            type: 'success',
            url: 'exp://auth/success?token=jwt-from-google-123',
        });

        mockLoginWithToken.mockResolvedValueOnce(undefined);

        const { getByText } = render(<GoogleAuthButton />);

        await act(async () => {
            fireEvent.press(getByText('Continue with Google'));
        });

        expect(mockLoginWithToken).toHaveBeenCalledWith('jwt-from-google-123', undefined);
    });

    it('should handle user cancel gracefully without crash or calling loginWithToken', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
            type: 'cancel',
        });

        const { getByText } = render(<GoogleAuthButton />);

        await act(async () => {
            fireEvent.press(getByText('Continue with Google'));
        });

        expect(mockLoginWithToken).not.toHaveBeenCalled();
    });

    it('should handle user dismiss (swipe away) gracefully without crash', async () => {
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
            type: 'dismiss',
        });

        const { getByText } = render(<GoogleAuthButton />);

        await act(async () => {
            fireEvent.press(getByText('Continue with Google'));
        });

        expect(mockLoginWithToken).not.toHaveBeenCalled();
    });

    it('should disable button while OAuth flow is in progress', async () => {
        // Use a controlled promise to verify the button is disabled during the flow
        let resolveOAuth!: Function;
        const pendingPromise = new Promise((resolve) => { resolveOAuth = resolve; });
        (WebBrowser.openAuthSessionAsync as jest.Mock).mockReturnValueOnce(pendingPromise);

        const { getByText } = render(<GoogleAuthButton />);

        // Press the button to start the OAuth flow
        // After press, the internal `loading` state is true and button should be disabled
        // We can't easily assert disabled in RNTL for TouchableOpacity, 
        // but we can verify the mock was called exactly once even if we press twice
        fireEvent.press(getByText('Continue with Google'));

        // Try pressing again while loading — second call should be blocked by disabled={loading}
        fireEvent.press(getByText('Continue with Google'));

        // Only one call should have gone through
        expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledTimes(1);

        // Clean up
        await act(async () => {
            resolveOAuth({ type: 'cancel' });
        });
    }, 10000);

    it('should not crash when WebBrowser throws an error', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (WebBrowser.openAuthSessionAsync as jest.Mock).mockRejectedValueOnce(
            new Error('WebBrowser unavailable')
        );

        const { getByText } = render(<GoogleAuthButton />);

        await act(async () => {
            fireEvent.press(getByText('Continue with Google'));
        });

        expect(mockLoginWithToken).not.toHaveBeenCalled();
        // Should not throw — the catch block handles it

        consoleErrorSpy.mockRestore();
    });
});
