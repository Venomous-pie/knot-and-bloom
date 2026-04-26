import { useAuth } from "@/contexts/AuthContext";
import { RelativePathString, useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { ClipboardCheck, CheckCircle, Store, Clock } from "lucide-react-native";

export default function ApplicationSubmittedPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.contentContainer, isDesktop ? styles.row : styles.column]}>
                {/* Left Side - Branding */}
                <View style={[styles.brandingSection, isDesktop ? { width: "50%" } : { width: "100%", paddingVertical: 40 }]}>
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />

                    <View style={styles.brandingContent}>
                        <Image
                            source={require('@/assets/yarn.png')}
                            style={styles.heroImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandTitle}>Application Submitted!</Text>
                        <Text style={styles.brandSubtitle}>
                            Welcome to the Knot & Bloom seller community
                        </Text>
                    </View>
                    <View style={styles.decorativeCircleBig} />
                </View>

                {/* Right Side - Content */}
                <View style={[styles.formSection, isDesktop ? { width: "50%" } : { width: "100%" }]}>
                    <View style={styles.formContent}>
                        <Text style={styles.welcomeTitle}>What's Next?</Text>

                        <View style={styles.stepContainer}>
                            <View style={styles.step}>
                                <View style={styles.stepIconContainer}>
                                    <ClipboardCheck size={20} color={theme.colors.primaryText} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Review in Progress</Text>
                                    <Text style={styles.stepDescription}>
                                        Our team will review your application within 48 hours.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.step}>
                                <View style={styles.stepIconContainer}>
                                    <CheckCircle size={20} color={theme.colors.primaryText} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Get Approved</Text>
                                    <Text style={styles.stepDescription}>
                                        Once approved, you'll receive an email notification and can start listing products.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.step}>
                                <View style={styles.stepIconContainer}>
                                    <Store size={20} color={theme.colors.primaryText} />
                                </View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Start Selling</Text>
                                    <Text style={styles.stepDescription}>
                                        Access your seller dashboard to add products and manage orders.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.statusBox}>
                            <Text style={styles.statusTitle}>Application Status</Text>
                            <View style={styles.statusBadge}>
                                <Clock size={16} color={theme.colors.badgePending} style={{ marginRight: 6 }} />
                                <Text style={styles.statusBadgeText}>PENDING REVIEW</Text>
                            </View>
                            <Text style={styles.statusHint}>
                                Logged in as: {user?.email}
                            </Text>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.primaryButton,
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push("/seller/application-status" as RelativePathString)}
                            >
                                <Text style={styles.primaryButtonText}>View Application Status</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.secondaryButton,
                                    pressed && { backgroundColor: theme.colors.subtle }
                                ]}
                                onPress={() => router.push("/" as RelativePathString)}
                            >
                                <Text style={styles.secondaryButtonText}>Return to Home</Text>
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
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        flex: 1,
    },
    row: {
        flexDirection: "row",
    },
    column: {
        flexDirection: "column",
    },
    brandingSection: {
        backgroundColor: theme.colors.backgroundAlt,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: theme.spacing['2xl'],
        minHeight: 300,
    },
    brandingContent: {
        zIndex: 2,
        alignItems: "center",
    },
    heroImage: {
        width: 120,
        height: 120,
        marginBottom: theme.spacing.lg,
    },
    brandTitle: {
        fontSize: theme.typography.sizes['3xl'],
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
        textAlign: "center",
    },
    brandSubtitle: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 24,
    },
    decorativeCircle1: {
        position: "absolute",
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: theme.colors.primaryLight,
    },
    decorativeCircle2: {
        position: "absolute",
        top: "40%",
        right: "20%",
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: theme.colors.primaryLight,
        opacity: 0.7,
    },
    decorativeCircleBig: {
        position: "absolute",
        bottom: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.colors.secondaryLight,
        zIndex: 1,
    },
    formSection: {
        justifyContent: "center",
        alignItems: "center",
        padding: theme.spacing['2xl'],
        backgroundColor: theme.colors.surface,
    },
    formContent: {
        width: "100%",
        maxWidth: 450,
    },
    welcomeTitle: {
        fontSize: theme.typography.sizes['2xl'],
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    stepContainer: {
        gap: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    step: {
        flexDirection: "row",
        gap: theme.spacing.md,
    },
    stepIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: theme.shadows.sm.shadowColor,
        shadowOffset: theme.shadows.sm.shadowOffset,
        shadowOpacity: theme.shadows.sm.shadowOpacity,
        shadowRadius: theme.shadows.sm.shadowRadius,
        elevation: theme.shadows.sm.elevation,
    },
    stepContent: {
        flex: 1,
        paddingTop: 2,
    },
    stepTitle: {
        fontSize: theme.typography.sizes.base,
        fontWeight: "600",
        color: theme.colors.text,
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        lineHeight: 20,
    },
    statusBox: {
        backgroundColor: theme.colors.backgroundAlt,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: "center",
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statusTitle: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: theme.spacing.sm,
        fontWeight: "600",
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warning + '20', // Add some transparency
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.badgePending + '40',
    },
    statusBadgeText: {
        color: theme.colors.badgePending,
        fontWeight: "bold",
        fontSize: theme.typography.sizes.sm,
    },
    statusHint: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
    },
    buttonContainer: {
        gap: theme.spacing.md,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        alignItems: "center",
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    primaryButtonText: {
        color: theme.colors.primaryText,
        fontSize: theme.typography.sizes.base,
        fontWeight: "bold",
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.sm,
        alignItems: "center",
        backgroundColor: theme.colors.surface,
    },
    secondaryButtonText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.base,
        fontWeight: "500",
    },
});
