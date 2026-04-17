import { sellerAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Image,
    Easing
} from "react-native";
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');
const MOBILE_BREAKPOINT = 768;

const STEPS = [
    {
        id: 1,
        icon: "🎉",
        title: "Welcome to the Community!",
        body: (name: string) => `Congratulations, ${name.split(' ')[0]}!\n\nYour seller application has been approved. You are now part of our curated marketplace of local artisans.`,
        cta: "Let's Get Started",
        secondary: "Close"
    },
    {
        id: 2,
        icon: "✨",
        title: "Create Your First Listing",
        body: () => `Showcase your products with beautiful photos and stories.\n\nHere are some tips for a great listing:`,
        tips: [
            "Use natural lighting for photos",
            "Tell the story behind your product",
            "Be specific about materials & size",
            "Set clear policies"
        ],
        cta: "Next",
        secondary: "Back"
    },
    {
        id: 3,
        icon: "🚀",
        title: "Ready to Sell?",
        body: () => `Your dashboard is your command center.`,
        features: [
            { label: "Track Orders", icon: "cart-outline" },
            { label: "View Analytics", icon: "bar-chart-outline" },
            { label: "Manage Products", icon: "pricetag-outline" },
            { label: "Chat with Buyers", icon: "chatbubbles-outline" }
        ],
        cta: "Go to Dashboard",
        secondary: "Back"
    }
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function SellerWelcomeModal({ visible, onClose }: Props) {
    const { user, refreshUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const iconFloat = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1.5)), // Slight bounce
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic),
                })
            ]).start();

            // Icon floating loop
            Animated.loop(
                Animated.sequence([
                    Animated.timing(iconFloat, {
                        toValue: -10,
                        duration: 1500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(iconFloat, {
                        toValue: 0,
                        duration: 1500,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(30);
            scaleAnim.setValue(0.95);
        }
    }, [visible]);

    const handleComplete = async () => {
        try {
            await sellerAPI.markWelcomeSeen();
            await refreshUser();
            onClose();
        } catch (error) {
            console.error(error);
            onClose();
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            // Fade out slightly before switching?
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();

            setTimeout(() => {
                setCurrentStep(currentStep + 1);
            }, 150);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();

            setTimeout(() => {
                setCurrentStep(currentStep - 1);
            }, 150);
        }
    };

    const stepData = STEPS[currentStep];
    const isMobile = Platform.OS !== 'web' || width < MOBILE_BREAKPOINT;

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.modalContainer,
                    isMobile && styles.mobileModal,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scale: scaleAnim }
                        ]
                    }
                ]}>
                    {/* Header Image / Pattern */}
                    <View style={styles.headerPattern}>
                        <View style={styles.headerCircle1} />
                        <View style={styles.headerCircle2} />
                    </View>

                    {/* Progress Dots */}
                    <View style={styles.progressContainer}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.progressDot,
                                    i === currentStep && styles.progressDotActive,
                                    i < currentStep && styles.progressDotCompleted
                                ]}
                            />
                        ))}
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.content}>
                        <Animated.Text style={[styles.icon, { transform: [{ translateY: iconFloat }] }]}>
                            {stepData.icon}
                        </Animated.Text>

                        <Text style={styles.title}>
                            {currentStep === 0 ? stepData.title : stepData.title}
                        </Text>

                        <Text style={styles.body}>
                            {typeof stepData.body === 'function' ? stepData.body(user?.name || '') : stepData.body}
                        </Text>

                        {/* Step 2 Tips */}
                        {stepData.tips && (
                            <View style={styles.tipsContainer}>
                                {stepData.tips.map((tip, i) => (
                                    <View key={i} style={styles.tipItem}>
                                        <View style={styles.tipIconBg}>
                                            <Ionicons name="checkmark" size={12} color="white" />
                                        </View>
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Step 3 Features Grid */}
                        {stepData.features && (
                            <View style={styles.gridContainer}>
                                {stepData.features.map((feature, i) => (
                                    <View key={i} style={styles.gridItem}>
                                        <View style={styles.gridIconContainer}>
                                            <Ionicons name={feature.icon as any} size={24} color={theme.colors.primaryDark} />
                                        </View>
                                        <Text style={styles.gridText}>{feature.label}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer / Buttons */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={currentStep === 0 ? onClose : handleBack}
                        >
                            <Text style={styles.secondaryBtnText}>{stepData.secondary}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                            <Text style={styles.primaryBtnText}>{stepData.cta}</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(50, 30, 20, 0.4)', // Warm dark overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        width: 500,
        maxHeight: '90%',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
    },
    mobileModal: {
        width: '100%',
    },
    headerPattern: {
        height: 120,
        backgroundColor: theme.colors.backgroundAlt, // Light cream/yellow
        position: 'relative',
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
    },
    headerCircle2: {
        position: 'absolute',
        bottom: -20,
        left: 20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 152, 0, 0.15)',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: -15, // Pull up into header area
        marginBottom: 20,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
    },
    progressDotActive: {
        backgroundColor: theme.colors.primaryDark,
        width: 20,
    },
    progressDotCompleted: {
        backgroundColor: theme.colors.success,
    },
    content: {
        paddingHorizontal: 32,
        paddingBottom: 24,
        alignItems: 'center',
        paddingTop: 0,
    },
    icon: {
        fontSize: 64,
        marginTop: -50, // Pull up to overlap header
        marginBottom: 16,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    body: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        maxWidth: 320,
    },
    tipsContainer: {
        width: '100%',
        backgroundColor: theme.colors.background,
        padding: 20,
        borderRadius: 16,
        gap: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tipIconBg: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipText: {
        fontSize: 15,
        color: theme.colors.text,
        flex: 1,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        width: '100%',
    },
    gridItem: {
        width: '45%',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    gridIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.backgroundAlt,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: theme.colors.subtle,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: theme.colors.primaryDark,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: theme.colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    secondaryBtnText: {
        color: theme.colors.textLight,
        fontSize: 16,
        fontWeight: '500',
    },
});
