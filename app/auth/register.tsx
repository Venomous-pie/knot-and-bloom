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

export default function RegisterPage() {
    const { register, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [name, setName] = useState('');
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

    const handleRegister = async () => {
        if (!name || !email || !password) {
            setError("Please fill in all fields");
            return;
        }
        setError('');
        setLoading(true);
        try {
            await register({ name, email, password });
            router.replace('/auth/login' as RelativePathString);
        } catch (e: any) {
            console.error(e);
            setError(e.response?.data?.message || "Registration failed. Please try again.");
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

                    <View style={styles.brandingContent}>
                        <Text style={styles.brandTitle}>Join Knot&Bloom</Text>
                        <Text style={styles.brandSubtitle}>
                            Create your account to start collecting unique handmade treasures.
                        </Text>
                        <View style={styles.featuresList}>
                            <Text style={styles.featureItem}>✔️ Exclusive member discounts</Text>
                            <Text style={styles.featureItem}>✔️ Track your orders easily</Text>
                            <Text style={styles.featureItem}>✔️ Save your favorite items</Text>
                        </View>
                    </View>
                    <View style={styles.decorativeCircleBig} />
                </View>

                {/* Right Side - Register Form */}
                <View style={[styles.formSection, isDesktop ? { width: '50%' } : { width: '100%' }]}>
                    <View style={styles.formContent}>
                        <Text style={styles.welcomeTitle}>Create Account</Text>
                        <Text style={styles.welcomeSubtitle}>Sign up for free</Text>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Jane Doe"
                            placeholderTextColor="#999"
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="hello@example.com"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Password</Text>
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
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>Create Account →</Text>
                            )}
                        </Pressable>

                        <View style={styles.footerLinkContainer}>
                            <Text style={{ color: '#666' }}>Already have an account? </Text>
                            <Pressable onPress={() => router.push('/auth/login' as RelativePathString)}>
                                <Text style={styles.linkText}>Sign in</Text>
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
        backgroundColor: '#F3F9F9', // Slightly cooler tone for register
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
        fontWeight: 'bold',
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
        color: '#555',
        marginBottom: 8,
    },
    decorativeCircle1: {
        position: 'absolute',
        top: 80,
        right: 80,
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#E0EDED',
    },
    decorativeCircle2: {
        position: 'absolute',
        bottom: '30%',
        left: '15%',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E0EDED',
        opacity: 0.5,
    },
    decorativeCircleBig: {
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: '#E6F0E6',
        opacity: 0.3,
        zIndex: 1,
    },
    formSection: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#fafafa',
        color: '#333',
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#8EA7C8', // Muted blue/slate
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: "#8EA7C8",
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
        color: '#8EA7C8',
        fontWeight: '600',
    }
});
