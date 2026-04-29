import { sellerAPI } from "@/api/api";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform
} from "react-native";
import Confetti from "@/components/Confetti";

const { width } = Dimensions.get('window');
const MOBILE_BREAKPOINT = 768;

const STEPS = [
    {
        id: 1,
        title: "Welcome to the Community!",
        body: (name: string) => `Congratulations, ${name ? name : 'Friend'}!\n\nYour seller application has been approved. You are now part of our curated marketplace of local makers.`,
        cta: "Let's Get Started",
        secondary: "Close"
    },
    {
        id: 2,
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
    const { user, refreshUser, loginWithToken } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleComplete = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await sellerAPI.markWelcomeSeen();
            // Backend returns a fresh JWT with role=SELLER and status=ACTIVE.
            // Store it via loginWithToken so the auth context updates immediately.
            if (res.data?.token) {
                await loginWithToken(res.data.token);
            } else {
                await refreshUser();
            }
            onClose();
        } catch (error) {
            console.error(error);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const stepData = STEPS[currentStep];
    const isMobile = Platform.OS !== 'web' || width < MOBILE_BREAKPOINT;

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, isMobile && styles.mobileModal]}>
                    {currentStep === 0 && (
                        <View style={{ alignItems: 'center', zIndex: 100 }}>
                            <Confetti force={0.8} duration={3000} particleCount={250} width={1600} />
                        </View>
                    )}
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>{stepData.title}</Text>
                    </View>

                    <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
                        <Text style={styles.body}>
                            {typeof stepData.body === 'function' ? stepData.body(user?.name || '') : stepData.body}
                        </Text>

                        {stepData.tips && (
                            <View style={styles.tipsContainer}>
                                {stepData.tips.map((tip, i) => (
                                    <View key={i} style={styles.tipItem}>
                                        <View style={styles.tipIconBg}>
                                            <Ionicons name="checkmark" size={14} color="white" />
                                        </View>
                                        <Text style={styles.tipText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {stepData.features && (
                            <View style={styles.gridContainer}>
                                {stepData.features.map((feature, i) => (
                                    <View key={i} style={styles.gridItem}>
                                        <View style={styles.gridIconContainer}>
                                            <Ionicons name={feature.icon as any} size={24} color={theme.colors.primary} />
                                        </View>
                                        <Text style={styles.gridText}>{feature.label}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

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

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={currentStep === 0 ? onClose : handleBack}
                        >
                            <Text style={styles.secondaryBtnText}>{stepData.secondary}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.primaryBtn} 
                            onPress={handleNext}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.primaryBtnText}>{stepData.cta}</Text>
                            <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.md,
    },
    modalContainer: {
        width: 500,
        maxHeight: '85%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        shadowColor: theme.shadows.lg.shadowColor,
        shadowOffset: theme.shadows.lg.shadowOffset,
        shadowOpacity: theme.shadows.lg.shadowOpacity,
        shadowRadius: theme.shadows.lg.shadowRadius,
        elevation: theme.shadows.lg.elevation,
    },
    mobileModal: {
        width: '100%',
        maxHeight: '90%',
    },
    headerContainer: {
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
    },
    scrollContent: {
        flexGrow: 0,
    },
    content: {
        padding: theme.spacing.xl,
    },
    body: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: theme.spacing.lg,
        fontFamily: theme.typography.fontFamily,
    },
    tipsContainer: {
        width: '100%',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        gap: theme.spacing.md,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    tipIconBg: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipText: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.text,
        flex: 1,
        fontFamily: theme.typography.fontFamily,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.md,
        justifyContent: 'center',
        width: '100%',
    },
    gridItem: {
        width: '47%',
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    gridIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    gridText: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.border,
    },
    progressDotActive: {
        backgroundColor: theme.colors.primary,
        width: 24,
    },
    progressDotCompleted: {
        backgroundColor: theme.colors.success,
    },
    footer: {
        padding: theme.spacing.xl,
        paddingTop: 0,
        backgroundColor: theme.colors.surface,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: theme.typography.sizes.base,
        fontFamily: theme.typography.fontFamily,
    },
    secondaryBtn: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    secondaryBtnText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.base,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
});
