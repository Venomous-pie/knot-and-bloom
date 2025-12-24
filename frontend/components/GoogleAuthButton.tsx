import * as React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Svg, Path } from 'react-native-svg';
import { useAuth } from '../app/auth';

WebBrowser.maybeCompleteAuthSession();

// Google Icon SVG
const GoogleIcon = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <Path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <Path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <Path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </Svg>
);

interface GoogleAuthButtonProps {
    text?: string;
    style?: any;
    textStyle?: any;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030';

export default function GoogleAuthButton({ text = "Continue with Google", style, textStyle }: GoogleAuthButtonProps) {
    const { loginWithToken } = useAuth();
    const [loading, setLoading] = React.useState(false);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const callbackUrl = Linking.createURL('/auth/success');

            const result = await WebBrowser.openAuthSessionAsync(
                `${API_URL}/auth/google`,
                callbackUrl
            );

            if (result.type === 'success') {
                const url = result.url;
                let token: string | null = null;
                try {
                    const parsedUrl = new URL(url);
                    token = parsedUrl.searchParams.get('token');
                } catch (e) {
                    const match = url.match(/token=([^&]*)/);
                    if (match) token = match[1];
                }

                if (token) {
                    await loginWithToken(token);
                }
            }
        } catch (error) {
            console.error('Google login error:', error);
            // Ideally trigger a toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.socialButton, style]}
            onPress={handleGoogleLogin}
            disabled={loading}
        >
            {loading ? <ActivityIndicator color="#333" /> : <GoogleIcon />}
            <Text style={[styles.socialButtonText, textStyle]}>
                {text}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    socialButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#eee",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    socialButtonText: {
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: "600",
        color: "#1a1a1a",
    },
});
