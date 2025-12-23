import { useAuth } from "@/app/auth";
import { RelativePathString, useRouter } from "expo-router";
import {
    CloudSnow,
    Eye,
    EyeOff,
    Facebook,
    Flower,
    Mail,
    Phone,
    Rose,
    Snowflake,
    Sparkles,
    SquircleDashed,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface BespokeAuthFormProps {
    initialMode?: "login" | "signup";
}

const generateRandomName = () => {
    const adjectives = ['Happy', 'Sunny', 'Creative', 'Clever', 'Bright', 'Swift', 'Gentle', 'Cosy', 'Lovely'];
    const nouns = ['Weaver', 'Crafter', 'Artist', 'Maker', 'Designer', 'Artisan', 'Creator', 'Knitter', 'Bloomer'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomAdjective} ${randomNoun} ${randomNumber}`;
};

export default function BespokeAuthForm({
    initialMode = "login",
}: BespokeAuthFormProps) {
    const { login, register, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const isDesktop = width > 1024;

    const [isSignUp, setIsSignUp] = useState(initialMode === "signup");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Auth Method State
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

    // Form State
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");

    // Focus State for Inputs
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    // Redirect if authenticated
    useEffect(() => {
        if (user && !authLoading) {
            router.replace("/");
        }
    }, [user, authLoading]);

    useEffect(() => {
        setIsSignUp(initialMode === "signup");
    }, [initialMode]);

    const toggleMode = (signup: boolean) => {
        setIsSignUp(signup);
        setError("");
        // Reset form? maybe keep email/phone populated
    };

    const handleAuth = async () => {
        setError("");
        setFieldErrors({});
        setIsLoading(true);
        Keyboard.dismiss();

        try {
            if (isSignUp) {
                if (!agreeToTerms) {
                    setError("You must agree to the terms and conditions");
                    setIsLoading(false);
                    return;
                }
                const randomName = generateRandomName();
                const payload = {
                    name: randomName,
                    password,
                    ...(authMethod === 'email' ? { email } : { phone: phoneNumber })
                };

                // Note: Ensure your backend handles 'phone' or maps it correctly
                await register(payload);
            } else {
                const payload = {
                    password,
                    ...(authMethod === 'email' ? { email } : { phone: phoneNumber })
                };
                await login(payload);
            }
        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.issues) {
                const newFieldErrors: Record<string, string> = {};
                err.response.data.issues.forEach((issue: any) => {
                    if (issue.path && issue.path.length > 0) {
                        newFieldErrors[issue.path[0]] = issue.message;
                    }
                });
                setFieldErrors(newFieldErrors);

                // Only show generic error if we couldn't map any specific field errors
                if (Object.keys(newFieldErrors).length === 0) {
                    setError(err.response?.data?.error || "Validation failed.");
                }
            } else {
                setError(
                    err.response?.data?.message || err.response?.data?.error || "Authentication failed. Please try again."
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Google Icon SVG (simplified)
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

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.container}>
                {/* Background Decoration */}
                <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
                    <View
                        style={[
                            styles.blurCircle,
                            {
                                top: -80,
                                left: -80,
                                backgroundColor: "#567F4F20",
                                width: 250,
                                height: 250,
                            },
                        ]}
                    />
                    <View
                        style={[
                            styles.blurCircle,
                            {
                                bottom: -80,
                                right: -80,
                                backgroundColor: "#B3697920",
                                width: 300,
                                height: 300,
                            },
                        ]}
                    />
                    <View
                        style={[
                            styles.blurCircle,
                            {
                                top: "40%",
                                left: "20%",
                                backgroundColor: "#E6C22915",
                                width: 150,
                                height: 150,
                            },
                        ]}
                    />

                    {/* Floating Icons Pattern */}
                    <View
                        style={{
                            position: "absolute",
                            top: 50,
                            left: 30,
                            opacity: 0.1,
                            transform: [{ rotate: "12deg" }],
                        }}
                    >
                        <Rose size={180} color="#B36979" />
                    </View>
                    <View
                        style={{
                            position: "absolute",
                            bottom: 100,
                            left: -20,
                            opacity: 0.08,
                        }}
                    >
                        <SquircleDashed size={120} color="#567F4F" />
                    </View>
                    <View
                        style={{ position: "absolute", top: 150, right: 40, opacity: 0.06 }}
                    >
                        <Snowflake size={90} color="#B36979" />
                    </View>
                    <View
                        style={{
                            position: "absolute",
                            bottom: 40,
                            right: 100,
                            opacity: 0.07,
                        }}
                    >
                        <CloudSnow size={100} color="#567F4F" />
                    </View>
                </View>

                {/* Main Content Grid */}
                <View
                    style={[
                        styles.gridContainer,
                        isDesktop && styles.gridContainerDesktop,
                    ]}
                >
                    {/* Left Side - Brand Storytelling (Desktop Only) */}
                    {isDesktop && (
                        <View style={styles.brandSection}>
                            <View style={styles.logoCornerDecoration}>
                                <Flower size={100} color="#567F4F" opacity={0.2} />
                            </View>

                            <View style={{ alignItems: "center", width: "100%" }}>
                                {/* Logo */}
                                <View style={{ marginBottom: 20, alignItems: "center" }}>
                                    <Text
                                        style={[
                                            styles.logoText,
                                            {
                                                color: "#B36979",
                                                fontSize: 84,
                                                transform: [{ translateX: -60 }],
                                                lineHeight: 90,
                                                marginBottom: -25,
                                                zIndex: 2
                                            },
                                        ]}
                                    >
                                        Knot
                                    </Text>
                                    <Text
                                        style={[
                                            styles.logoText,
                                            {
                                                color: "#567F4F",
                                                fontSize: 56,
                                                marginVertical: -15,
                                                zIndex: 1
                                            },
                                        ]}
                                    >
                                        &
                                    </Text>
                                    <Text
                                        style={[
                                            styles.logoText,
                                            {
                                                color: "#567F4F",
                                                fontSize: 84,
                                                transform: [{ translateX: 50 }],
                                                lineHeight: 90,
                                                marginTop: -25
                                            },
                                        ]}
                                    >
                                        Bloom
                                    </Text>
                                </View>

                                <View style={styles.separator}>
                                    <View style={styles.separatorLine} />
                                    <Image
                                        source={require("../../assets/yarn.png")}
                                        style={{ width: 30, height: 30, marginHorizontal: 10 }}
                                        resizeMode="contain"
                                        onError={(e) =>
                                            console.log("Logo load error", e.nativeEvent.error)
                                        }
                                    />
                                    <View
                                        style={[
                                            styles.separatorLine,
                                            { backgroundColor: "#E6C229" },
                                        ]}
                                    />
                                </View>

                                <Text style={styles.brandDescription}>
                                    Where artisans and craft lovers unite. Join a vibrant
                                    community dedicated to handmade treasures and timeless
                                    creations.
                                </Text>

                                <View style={styles.featuresGrid}>
                                    <View style={styles.featureItem}>
                                        <Image
                                            source={require("../../assets/curated.png")}
                                            style={{ width: 60, height: 60 }}
                                            resizeMode="contain"
                                        />
                                        <View>
                                            <Text style={styles.featureTitle}>Curated</Text>
                                            <Text style={styles.featureSubtitle}>
                                                Handpicked artisans
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.featureItem}>
                                        <Image
                                            source={require("../../assets/secure-payment.png")}
                                            style={{ width: 48, height: 48 }}
                                            resizeMode="contain"
                                        />
                                        <View>
                                            <Text style={styles.featureTitle}>Secure</Text>
                                            <Text style={styles.featureSubtitle}>
                                                Protected payments
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.bottomDecoration}>
                                <View style={styles.yarnKnotDecoration}>
                                    {/* Simulated Knot using overlapping circles/paths could go here, staying simple with View/Icon */}
                                    {/* <Image source={require('../../assets/yarn.png')} style={{width: 200, height: 200, opacity: 0.1}} resizeMode="contain" /> */}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Right Side - Auth Form */}
                    <View style={styles.formSection}>
                        {/* Mobile Header */}
                        {!isDesktop && (
                            <View style={styles.mobileHeader}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Image
                                        source={require("../../assets/yarn.png")}
                                        style={{ width: 40, height: 40, marginRight: 8 }}
                                        resizeMode="contain"
                                    />
                                    <Text style={[styles.logoTextMobile, { color: "#B36979" }]}>
                                        Knot
                                    </Text>
                                    <Text style={[styles.logoTextMobile, { color: "#567F4F" }]}>
                                        &Bloom
                                    </Text>
                                </View>
                                <Text style={styles.mobileTagline}>
                                    Join our artisan community
                                </Text>
                            </View>
                        )}

                        <View style={styles.card}>
                            {/* Mode Toggle */}
                            <View style={styles.toggleContainer}>
                                <Pressable
                                    onPress={() => toggleMode(false)}
                                    style={[
                                        styles.toggleButton,
                                        !isSignUp && styles.toggleButtonActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.toggleText,
                                            !isSignUp && styles.toggleTextActive,
                                        ]}
                                    >
                                        Sign In
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => toggleMode(true)}
                                    style={[
                                        styles.toggleButton,
                                        isSignUp && styles.toggleButtonActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.toggleText,
                                            isSignUp && styles.toggleTextActive,
                                        ]}
                                    >
                                        Sign Up
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={styles.formContent}>
                                {/* Social Auth */}
                                <View style={{ gap: 12 }}>
                                    <TouchableOpacity style={styles.socialButton}>
                                        <GoogleIcon />
                                        <Text style={styles.socialButtonText}>
                                            Continue with Google
                                        </Text>
                                    </TouchableOpacity>
                                    {/* Facebook Icon can be from Lucide or custom SVG */}
                                    <TouchableOpacity style={styles.socialButton}>
                                        <Facebook
                                            size={20}
                                            color={"transparent"}
                                            fill="#3785ebff"
                                        />
                                        <Text style={styles.socialButtonText}>
                                            Continue with Facebook
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>or continue with</Text>
                                    <View style={styles.dividerLine} />
                                </View>



                                {/* Error Message */}
                                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                {/* Form Fields */}
                                <View style={{ gap: 16 }}>

                                    {authMethod === 'email' ? (
                                        <View>
                                            <Text style={styles.label}>Email Address</Text>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    focusedInput === "email" && styles.inputFocused,
                                                ]}
                                                placeholder="artisan@gmail.com"
                                                placeholderTextColor="#999"
                                                value={email}
                                                onChangeText={setEmail}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                onFocus={() => setFocusedInput("email")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor="#B36979"
                                            />
                                            {fieldErrors.email && <Text style={styles.errorTextSmall}>{fieldErrors.email}</Text>}
                                        </View>
                                    ) : (
                                        <View>
                                            <Text style={styles.label}>Phone Number</Text>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    focusedInput === "phone" && styles.inputFocused,
                                                ]}
                                                placeholder="+63 912 345 6789"
                                                placeholderTextColor="#999"
                                                value={phoneNumber}
                                                onChangeText={setPhoneNumber}
                                                keyboardType="phone-pad"
                                                onFocus={() => setFocusedInput("phone")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor="#B36979"
                                            />
                                            {fieldErrors.phone && <Text style={styles.errorTextSmall}>{fieldErrors.phone}</Text>}
                                        </View>
                                    )}

                                    <View>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Text style={styles.label}>Password</Text>
                                            {!isSignUp && (
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        router.push(
                                                            "/auth/reset-password" as RelativePathString
                                                        )
                                                    }
                                                >
                                                    <Text style={styles.forgotPassword}>Forgot?</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <View style={{ position: "relative" }}>
                                            <TextInput
                                                style={[
                                                    styles.input,
                                                    focusedInput === "password" && styles.inputFocused,
                                                    { paddingRight: 50 },
                                                ]}
                                                placeholder="••••••••••"
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
                                                onFocus={() => setFocusedInput("password")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor="#B36979"
                                            />
                                            <Pressable
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeIcon}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={20} color="#999" />
                                                ) : (
                                                    <Eye size={20} color="#999" />
                                                )}
                                            </Pressable>
                                        </View>
                                        {fieldErrors.password && <Text style={styles.errorTextSmall}>{fieldErrors.password}</Text>}
                                    </View>
                                </View>

                                {isSignUp && (
                                    <View style={styles.checkboxContainer}>
                                        <Switch
                                            value={agreeToTerms}
                                            onValueChange={setAgreeToTerms}
                                            trackColor={{ false: "#e0e0e0", true: "#B36979" }}
                                            thumbColor={"#fff"}
                                        />
                                        <Text style={styles.checkboxLabel}>
                                            I agree to the{" "}
                                            <Text style={styles.linkText}>Terms & Conditions</Text>{" "}
                                            and <Text style={styles.linkText}>Privacy Policy</Text>
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        (isLoading || (isSignUp && !agreeToTerms)) &&
                                        styles.submitButtonDisabled,
                                    ]}
                                    onPress={handleAuth}
                                    disabled={isLoading || (isSignUp && !agreeToTerms)}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>
                                            {isSignUp ? "Create Account" : "Sign In"}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginTop: 20, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setAuthMethod(authMethod === 'email' ? 'phone' : 'email')}
                                >
                                    <Text style={styles.switchMethodText}>
                                        {isSignUp
                                            ? (authMethod === 'email' ? "Sign up with phone?" : "Sign up with email?")
                                            : (authMethod === 'email' ? "Sign in with phone?" : "Sign in with email?")
                                        }
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FCFAF9", // Warm off-white paper texture
        minHeight: "100%",
    },
    blurCircle: {
        position: "absolute",
        borderRadius: 9999,
    },
    gridContainer: {
        flex: 1,
        flexDirection: "column",
        maxWidth: 1200,
        alignSelf: "center",
        width: "100%",
        padding: 20,
    },
    gridContainerDesktop: {
        flexDirection: "row",
        paddingVertical: 60,
        gap: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    brandSection: {
        flex: 1,
        padding: 40,
        position: "relative",
        maxWidth: 500,
    },
    formSection: {
        flex: 1,
        maxWidth: 500,
        width: "100%",
    },
    logoText: {
        fontFamily: "Lovingly",
        fontSize: 48,
        fontWeight: "bold",
    },
    logoTextMobile: {
        fontFamily: "Lovingly",
        fontSize: 32,
        fontWeight: "bold",
    },
    separator: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 24,
        marginTop: 10,
    },
    separatorLine: {
        height: 2,
        width: 60,
        backgroundColor: "#B36979",
        borderRadius: 2,
    },
    brandDescription: {
        fontSize: 18,
        color: "#666",
        lineHeight: 28,
        marginBottom: 32,
        fontFamily: Platform.OS === "web" ? "System" : undefined,
    },
    featuresGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 35,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        width: "45%",
    },
    featureIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    featureTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: "#333",
    },
    featureSubtitle: {
        fontSize: 12,
        color: "#888",
    },
    errorTextSmall: {
        color: "#EF4444",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    mobileHeader: {
        alignItems: "center",
        marginBottom: 24,
    },
    mobileTagline: {
        color: "#888",
        fontSize: 14,
        marginTop: 8,
    },
    card: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(230, 230, 230, 0.6)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
        position: "relative",
        overflow: "hidden",
    },
    cardCorner: {
        position: "absolute",
        width: 80,
        height: 80,
    },
    toggleContainer: {
        flexDirection: "row",
        backgroundColor: "#F5F5F5",
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
    },
    toggleButtonActive: {
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontWeight: "500",
        color: "#888",
        fontSize: 15,
    },
    toggleTextActive: {
        color: "#333",
        fontWeight: "bold",
    },
    switchMethodText: {
        color: '#B36979',
        fontSize: 14,
        fontWeight: '500',
    },
    formContent: {
        gap: 20,
    },
    socialButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#EEE",
        backgroundColor: "white",
        gap: 12,
    },
    socialButtonText: {
        fontWeight: "600",
        color: "#444",
        fontSize: 15,
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#EEEEEE",
    },
    dividerText: {
        marginHorizontal: 12,
        color: "#AAA",
        fontSize: 13,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#444",
        marginBottom: 8,
    },
    typeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#EEE",
        backgroundColor: "#FAFAFA",
        alignItems: "center",
    },
    typeButtonActive: {
        borderColor: "#B36979",
        backgroundColor: "#B369790D",
    },
    typeTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: "#444",
        marginBottom: 4,
    },
    typeSubtitle: {
        fontSize: 12,
        color: "#888",
    },
    input: {
        height: 52,
        borderWidth: 2,
        borderColor: "#EEE",
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: "#FAFAFA",
        color: "#333",
        outlineStyle: 'none' as any
    },
    inputFocused: {
        borderColor: "#B36979",
        backgroundColor: "white",
    },
    eyeIcon: {
        position: "absolute",
        right: 16,
        top: 16,
    },
    forgotPassword: {
        fontSize: 13,
        color: "#B36979",
        fontWeight: "600",
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        color: "#666",
        lineHeight: 20,
    },
    linkText: {
        color: "#B36979",
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: "#B36979",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: "#B36979",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0.1,
    },
    submitButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    errorText: {
        color: "#D32F2F",
        backgroundColor: "#FFEBEE",
        padding: 12,
        borderRadius: 8,
        fontSize: 14,
        textAlign: "center",
    },
    logoCornerDecoration: {
        position: "absolute",
        top: -60,
        left: -60,
        opacity: 0.6,
        transform: [{ rotate: "-15deg" }],
    },
    bottomDecoration: {
        position: "absolute",
        bottom: 0,
        right: 0,
    },
    yarnKnotDecoration: {
        position: "absolute",
        bottom: -40,
        right: -40,
        opacity: 0.1,
    },
});
