import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginPage() {
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    React.useEffect(() => {
        if (user && !authLoading) {
            router.replace('/');
        }
    }, [user, authLoading]);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await login({ email, password });
            // Navigation handled in AuthProvider or here
            router.replace('/');
        } catch (e: any) {
            console.error(e);
            setError(e.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.contentContainer, isDesktop ? styles.row : styles.column]}>
                {/* Left Side - Branding */}
                <View style={[styles.brandingSection, isDesktop ? { width: '50%' } : { width: '100%', height: 200 }]}>
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />
                    <View style={styles.decorativeCircle3} />

                    <View style={styles.brandingContent}>
                        {/* Heart Icon Stand-in */}
                        <Text style={{ fontSize: 40, marginBottom: 20 }}>❤️</Text>
                        <Text style={styles.brandTitle}>Knot&Bloom</Text>
                        <Text style={styles.brandSubtitle}>
                            Discover handcrafted treasures made with love and care
                        </Text>
                        <View style={styles.featuresList}>
                            <Text style={styles.featureItem}>• Artisan-crafted crochet & knit pieces</Text>
                            <Text style={styles.featureItem}>• Sustainable, eco-friendly materials</Text>
                            <Text style={styles.featureItem}>• Unique designs you won't find elsewhere</Text>
                        </View>
                    </View>
                    <View style={styles.decorativeCircleBig} />
                </View>

                {/* Right Side - Login Form */}
                <View style={[styles.formSection, isDesktop ? { width: '50%' } : { width: '100%' }]}>
                    <View style={styles.formContent}>
                        <Text style={styles.welcomeTitle}>Welcome back</Text>
                        <Text style={styles.welcomeSubtitle}>Sign in to continue shopping</Text>

                        {/* Social Buttons (Placeholders) */}
                        <Pressable style={styles.socialButton}>
                            <Text style={styles.socialButtonText}>Continue with Google</Text>
                        </Pressable>
                        <Pressable style={styles.socialButton}>
                            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                        </Pressable>

                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or continue with email</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="hello@example.com"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.label}>Password</Text>
                            <Text style={styles.forgotPassword}>Forgot password?</Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor="#999"
                            secureTextEntry
                        />

                        <Pressable
                            style={({ pressed }) => [
                                styles.submitButton,
                                pressed && styles.submitButtonPressed,
                                loading && styles.submitButtonDisabled
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>Sign In →</Text>
                            )}
                        </Pressable>

                        <View style={styles.footerLinkContainer}>
                            <Text style={{ color: '#666' }}>Don't have an account? </Text>
                            <Pressable onPress={() => router.push('/auth/register' as RelativePathString)}>
                                <Text style={styles.linkText}>Sign up</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
    },
    column: {
        flexDirection: 'column',
    },
    brandingSection: {
        backgroundColor: '#F9F5F3',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: 40,
    },
    brandingContent: {
        zIndex: 2,
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: 'bold', // "Times New Roman" feel
        color: '#333',
        marginBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    brandSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        maxWidth: 300,
        lineHeight: 24,
    },
    featuresList: {
        alignItems: 'flex-start',
    },
    featureItem: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#F0E6E6',
    },
    decorativeCircle2: {
        position: 'absolute',
        top: '40%',
        right: '20%',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#E8D5D9',
    },
    decorativeCircle3: {
        position: 'absolute',
        bottom: 100,
        left: 80,
        width: 40,
        height: 40,
        backgroundColor: '#E8D5D9',
        borderRadius: 20,
        opacity: 0.5,
    },
    decorativeCircleBig: {
        position: 'absolute',
        bottom: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#E6F0E6', // Light green hint
        opacity: 0.5,
        zIndex: 1,
    },
    formSection: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFCF9', // Very light warmth
    },
    formContent: {
        width: '100%',
        maxWidth: 400,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 30,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    socialButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#eee',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#aaa',
        fontSize: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
        marginBottom: 16,
    },
    forgotPassword: {
        color: '#B36979',
        fontSize: 12,
        marginBottom: 8,
    },
    submitButton: {
        backgroundColor: '#C88EA7', // Muted pink
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#C88EA7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    submitButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.99 }],
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    footerLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    linkText: {
        color: '#B36979',
        fontWeight: '600',
    }
});
