import { useAuth } from "@/app/auth";
import { authAPI } from "@/api/api";
import { theme } from "@/constants/theme";
import GoogleAuthButton from "@/components/GoogleAuthButton";
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
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import React, { useEffect, useState, useRef } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
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
    const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

    // OTP State
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);

    // Refs
    const passwordInputRef = useRef<TextInput>(null);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Animation state
    const [containerWidth, setContainerWidth] = useState(0);
    const translateX = useSharedValue(0);

    // Calculate tab width (container width - padding * 2) / 2
    const tabWidth = containerWidth ? (containerWidth - 8) / 2 : 0;

    useEffect(() => {
        if (tabWidth > 0) {
            translateX.value = withTiming(isSignUp ? tabWidth : 0, {
                duration: 300,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });
        }
    }, [isSignUp, tabWidth]);

    // Countdown Timer Effect
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (retryCountdown !== null && retryCountdown > 0) {
            timer = setTimeout(() => {
                setRetryCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
            }, 1000);
        } else if (retryCountdown === 0) {
            setRetryCountdown(null);
            setError(""); // Clear error when timer finishes
        }
        return () => clearTimeout(timer);
    }, [retryCountdown]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
            width: tabWidth,
        };
    });

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

                if (authMethod === 'phone') {
                    // 1. Send OTP first
                    try {
                        await authAPI.sendOTP(phoneNumber);
                        setShowOtpModal(true);
                        setResendCooldown(60); // Start timer on first open
                    } catch (err: any) {
                        setError(err.response?.data?.message || "Failed to send OTP.");
                    }
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
                if (err.response?.status === 429 && err.response?.data?.retryAfter) {
                    setRetryCountdown(err.response.data.retryAfter);
                    setError(`Too many attempts. Please wait ${err.response.data.retryAfter}s.`);
                } else {
                    setError(
                        err.response?.data?.message || err.response?.data?.error || "Authentication failed. Please try again."
                    );
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Resend Timer
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return;

        setError("");
        try {
            await authAPI.sendOTP(phoneNumber);
            setResendCooldown(60); // 1 minute cooldown
            setOtpCode(""); // Reset inputs
        } catch (err: any) {
            // Handle 429 specifically if we want custom message, otherwise use backend message
            setError(err.response?.data?.message || err.response?.data?.error || "Failed to resend OTP.");
        }
    };

    const handleVerifyOtp = async () => {
        setOtpLoading(true);
        setError(""); // Clear previous errors
        try {
            const randomName = generateRandomName();
            const payload = {
                name: randomName,
                password,
                phone: phoneNumber,
                otp: otpCode
            };
            await register(payload);
            // On success, the useAuth effect will redirect
            setShowOtpModal(false);
        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.issues) {
                // If validation error on OTP
                const otpError = err.response.data.issues.find((i: any) => i.path.includes('otp'));
                if (otpError) {
                    setError(otpError.message);
                } else {
                    setError("Registration failed.");
                }
            } else {
                setError(err.response?.data?.message || "Invalid OTP");
            }
        } finally {
            setOtpLoading(false);
        }
    };

    // Google Icon SVG removed as it is now inside GoogleAuthButton

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
                                backgroundColor: theme.colors.secondary + "20",
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
                                backgroundColor: theme.colors.primary + "20",
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
                                backgroundColor: theme.colors.accent + "15",
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
                        <Rose size={180} color={theme.colors.primary} />
                    </View>
                    <View
                        style={{
                            position: "absolute",
                            bottom: 100,
                            left: -20,
                            opacity: 0.08,
                        }}
                    >
                        <SquircleDashed size={120} color={theme.colors.secondary} />
                    </View>
                    <View
                        style={{ position: "absolute", top: 150, right: 40, opacity: 0.06 }}
                    >
                        <Snowflake size={90} color={theme.colors.primary} />
                    </View>
                    <View
                        style={{
                            position: "absolute",
                            bottom: 40,
                            right: 100,
                            opacity: 0.07,
                        }}
                    >
                        <CloudSnow size={100} color={theme.colors.secondary} />
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
                                <Flower size={100} color={theme.colors.secondary} opacity={0.2} />
                            </View>

                            <View style={{ alignItems: "center", width: "100%" }}>
                                {/* Logo */}
                                <View style={{ marginBottom: 20, alignItems: "center" }}>
                                    <Text
                                        style={[
                                            styles.logoText,
                                            {
                                                color: theme.colors.primary,
                                                fontSize: 84,
                                                transform: [{ translateX: -60 }],
                                                lineHeight: 130,
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
                                                color: theme.colors.secondary,
                                                fontSize: 56,
                                                lineHeight: 60,
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
                                                color: theme.colors.secondary,
                                                fontSize: 84,
                                                transform: [{ translateX: 60 }],
                                                lineHeight: 200,
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
                                            { backgroundColor: theme.colors.secondary },
                                        ]}
                                    />
                                </View>

                                {isSignUp ? (
                                    <Text style={styles.brandDescription}>
                                        Unique finds from creators who pour their heart into every piece.
                                    </Text>
                                ) : (
                                    <Text style={styles.brandDescription}>
                                        Your favorite finds are waiting!
                                    </Text>
                                )}

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
                                    <Text style={[styles.logoTextMobile, { color: theme.colors.primary }]}>
                                        Knot
                                    </Text>
                                    <Text style={[styles.logoTextMobile, { color: theme.colors.secondary }]}>
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
                            <View
                                style={styles.toggleContainer}
                                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                            >
                                {tabWidth > 0 && (
                                    <Reanimated.View
                                        style={[
                                            styles.toggleButtonActive,
                                            {
                                                position: "absolute",
                                                top: 4,
                                                bottom: 4,
                                                left: 4,
                                                borderRadius: 4,
                                                zIndex: 0,
                                            },
                                            animatedStyle,
                                        ]}
                                    />
                                )}
                                <Pressable
                                    onPress={() => toggleMode(false)}
                                    style={[
                                        styles.toggleButton,
                                        { zIndex: 1 },
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
                                        { zIndex: 1 },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.toggleText,
                                            isSignUp && styles.toggleTextActive,
                                        ]}
                                    >
                                        Create Account
                                    </Text>
                                </Pressable>
                            </View>


                            <View style={styles.formContent}>
                                {/* Social Auth */}
                                <View style={{ gap: 12 }}>
                                    <GoogleAuthButton
                                        text="Continue with Google"
                                        style={styles.socialButton}
                                        textStyle={styles.socialButtonText}
                                    />
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
                                                placeholderTextColor={theme.colors.textLight}
                                                value={email}
                                                onChangeText={setEmail}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                onFocus={() => setFocusedInput("email")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor={theme.colors.primary}
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                            />
                                            {fieldErrors.email && (
                                                <View>
                                                    <Text style={styles.errorTextSmall}>{fieldErrors.email}</Text>
                                                    {/* Smart Suggestion: If it looks like a phone number */}
                                                    {/^[0-9+()\s-]+$/.test(email) && email.length > 3 && (
                                                        <TouchableOpacity onPress={() => {
                                                            setPhoneNumber(email);
                                                            setEmail("");
                                                            setAuthMethod('phone');
                                                            setFieldErrors({});
                                                        }}>
                                                            <Text style={[styles.errorTextSmall, { color: theme.colors.primary, textDecorationLine: 'underline' }]}>
                                                                Looks like a phone number? Switch to Phone
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
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
                                                placeholderTextColor={theme.colors.textLight}
                                                value={phoneNumber}
                                                onChangeText={setPhoneNumber}
                                                keyboardType="phone-pad"
                                                onFocus={() => setFocusedInput("phone")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor={theme.colors.primary}
                                                returnKeyType="next"
                                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                                                blurOnSubmit={false}
                                            />
                                            {fieldErrors.phone && (
                                                <View>
                                                    <Text style={styles.errorTextSmall}>{fieldErrors.phone}</Text>
                                                    {/* Smart Suggestion: If it looks like an email */}
                                                    {phoneNumber.includes('@') && (
                                                        <TouchableOpacity onPress={() => {
                                                            setEmail(phoneNumber);
                                                            setPhoneNumber("");
                                                            setAuthMethod('email');
                                                            setFieldErrors({});
                                                        }}>
                                                            <Text style={[styles.errorTextSmall, { color: theme.colors.primary, textDecorationLine: 'underline' }]}>
                                                                Looks like an email? Switch to Email
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
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
                                                placeholderTextColor={theme.colors.textLight}
                                                secureTextEntry={!showPassword}
                                                value={password}
                                                onChangeText={setPassword}
                                                onFocus={() => setFocusedInput("password")}
                                                onBlur={() => setFocusedInput(null)}
                                                selectionColor={theme.colors.primary}
                                                ref={passwordInputRef}
                                                returnKeyType="go"
                                                onSubmitEditing={handleAuth}
                                            />
                                            <Pressable
                                                onPress={() => setShowPassword(!showPassword)}
                                                style={styles.eyeIcon}
                                            >
                                                {showPassword ? (
                                                    <EyeOff size={20} color={theme.colors.textLight} />
                                                ) : (
                                                    <Eye size={20} color={theme.colors.textLight} />
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
                                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                            thumbColor={"white"}
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
                                        (isLoading || (isSignUp && !agreeToTerms) || retryCountdown !== null) &&
                                        styles.submitButtonDisabled,
                                    ]}
                                    onPress={handleAuth}
                                    disabled={isLoading || (isSignUp && !agreeToTerms) || retryCountdown !== null}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : retryCountdown !== null ? (
                                        <Text style={styles.submitButtonText}>
                                            Try again in {retryCountdown}s
                                        </Text>
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
            {/* OTP Modal Overlay - Full Screen with Boxed Inputs */}
            <Modal
                visible={showOtpModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowOtpModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1, backgroundColor: theme.colors.background }}
                >
                    <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowOtpModal(false)}
                            style={{ position: 'absolute', top: 50, left: 24, padding: 8 }}
                        >
                            <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>

                        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 12, color: theme.colors.text, textAlign: "center" }}>
                            Verification Code
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, marginBottom: 32, textAlign: "center", fontSize: 16 }}>
                            We have sent the verification code to{"\n"}
                            <Text style={{ fontWeight: "bold", color: theme.colors.text }}>{phoneNumber}</Text>
                        </Text>

                        {/* Boxed Inputs */}
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 32, justifyContent: 'center' }}>
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                                <View
                                    key={index}
                                    style={{
                                        width: 45,
                                        height: 55,
                                        borderWidth: 1,
                                        borderColor: otpCode.length === index ? theme.colors.primary : theme.colors.border,
                                        borderRadius: 4,
                                        justifyContent: "center",
                                        alignItems: "center",
                                        backgroundColor: theme.colors.background,
                                    }}
                                >
                                    <Text style={{ fontSize: 24, fontWeight: "bold", color: theme.colors.text }}>
                                        {otpCode[index] || ""}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Hidden Input for handling typing */}
                        <TextInput
                            style={{
                                position: "absolute",
                                width: "100%",
                                height: 100,
                                opacity: 0,
                            }}
                            value={otpCode}
                            onChangeText={(text) => {
                                if (text.length <= 6) setOtpCode(text);
                                if (text.length === 6) {
                                    // Optional: Auto submit
                                    Keyboard.dismiss();
                                }
                            }}
                            keyboardType="number-pad"
                            caretHidden={true}
                            autoFocus={true}
                        />

                        {/* Error Handling */}
                        {error ? <Text style={[styles.errorText, { marginBottom: 20 }]}>{error}</Text> : null}

                        {/* Verify Button */}
                        <TouchableOpacity
                            onPress={handleVerifyOtp}
                            disabled={otpLoading || otpCode.length !== 6}
                            style={[
                                styles.submitButton,
                                { width: "100%", maxWidth: 400 },
                                (otpLoading || otpCode.length !== 6) && styles.submitButtonDisabled,
                            ]}
                        >
                            {otpLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>Verify</Text>
                            )}
                        </TouchableOpacity>

                        {/* Resend Logic */}
                        <View style={{ marginTop: 24 }}>
                            {resendCooldown > 0 ? (
                                <Text style={{ color: theme.colors.textLight, fontSize: 14 }}>
                                    Resend code in {resendCooldown}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResendOtp}>
                                    <Text style={{ color: theme.colors.primary, fontWeight: "bold", fontSize: 16 }}>
                                        Resend Code
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background, // Warm off-white paper texture
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
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    brandDescription: {
        fontSize: 18,
        color: theme.colors.textSecondary,
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
        color: theme.colors.text,
    },
    featureSubtitle: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    errorTextSmall: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    mobileHeader: {
        alignItems: "center",
        marginBottom: 24,
    },
    mobileTagline: {
        color: theme.colors.textLight,
        fontSize: 14,
        marginTop: 8,
    },
    card: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 8,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(230, 230, 230, 0.6)",
        shadowColor: theme.colors.shadow,
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
        backgroundColor: theme.colors.backgroundAlt,
        borderRadius: 4,
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
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleText: {
        fontWeight: "500",
        color: theme.colors.textLight,
        fontSize: 15,
    },
    toggleTextActive: {
        color: theme.colors.text,
        fontWeight: "bold",
    },
    switchMethodText: {
        color: theme.colors.primary,
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
        borderRadius: 4,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: "white",
        gap: 12,
    },
    socialButtonText: {
        fontWeight: "600",
        color: theme.colors.text,
        fontSize: 15,
        fontFamily: 'Quicksand'
    },
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 4,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    dividerText: {
        marginHorizontal: 12,
        color: theme.colors.textLight,
        fontSize: 13,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 8,
    },
    typeButton: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundAlt,
        alignItems: "center",
    },
    typeButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + "0D",
    },
    typeTitle: {
        fontWeight: "bold",
        fontSize: 16,
        color: theme.colors.text,
        marginBottom: 4,
    },
    typeSubtitle: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    input: {
        height: 52,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 4,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: theme.colors.backgroundAlt,
        color: theme.colors.text,
        outlineStyle: 'none' as any
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: "white",
    },
    eyeIcon: {
        position: "absolute",
        right: 16,
        top: 16,
    },
    forgotPassword: {
        fontSize: 13,
        color: theme.colors.primary,
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
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    linkText: {
        color: theme.colors.primary,
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        borderRadius: 4,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: theme.colors.primary,
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
        color: theme.colors.errorDark,
        backgroundColor: theme.colors.errorLight,
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
