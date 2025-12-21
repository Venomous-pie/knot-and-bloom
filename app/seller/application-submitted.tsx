import { useAuth } from "@/app/auth";
import { RelativePathString, useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
                        <Text style={{ fontSize: 60, marginBottom: 20 }}>🎉</Text>
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
                                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Review in Progress</Text>
                                    <Text style={styles.stepDescription}>
                                        Our team will review your application within 48 hours.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.step}>
                                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                                <View style={styles.stepContent}>
                                    <Text style={styles.stepTitle}>Get Approved</Text>
                                    <Text style={styles.stepDescription}>
                                        Once approved, you'll receive an email notification and can start listing products.
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.step}>
                                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
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
                                <Text style={styles.statusBadgeText}>⏳ PENDING REVIEW</Text>
                            </View>
                            <Text style={styles.statusHint}>
                                Logged in as: {user?.email}
                            </Text>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={styles.primaryButton}
                                onPress={() => router.replace("/" as RelativePathString)}
                            >
                                <Text style={styles.primaryButtonText}>Return to Marketplace →</Text>
                            </Pressable>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => router.push("/seller-dashboard/orders" as RelativePathString)}
                            >
                                <Text style={styles.secondaryButtonText}>View Seller Dashboard</Text>
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
        backgroundColor: "#fff",
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
        backgroundColor: "#F9F5F3",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: 40,
        minHeight: 300,
    },
    brandingContent: {
        zIndex: 2,
        alignItems: "center",
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
        textAlign: "center",
    },
    brandSubtitle: {
        fontSize: 16,
        color: "#666",
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
        borderColor: "#F0E6E6",
    },
    decorativeCircle2: {
        position: "absolute",
        top: "40%",
        right: "20%",
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "#E8D5D9",
    },
    decorativeCircleBig: {
        position: "absolute",
        bottom: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#D4EDDA",
        opacity: 0.5,
        zIndex: 1,
    },
    formSection: {
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
        backgroundColor: "#FFFCF9",
    },
    formContent: {
        width: "100%",
        maxWidth: 450,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 24,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    stepContainer: {
        gap: 20,
        marginBottom: 30,
    },
    step: {
        flexDirection: "row",
        gap: 16,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#C88EA7",
        justifyContent: "center",
        alignItems: "center",
    },
    stepNumberText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    statusBox: {
        backgroundColor: "#FFF9E6",
        padding: 20,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#FFE599",
    },
    statusTitle: {
        fontSize: 12,
        color: "#666",
        textTransform: "uppercase",
        marginBottom: 8,
    },
    statusBadge: {
        backgroundColor: "#FFC107",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 8,
    },
    statusBadgeText: {
        color: "#333",
        fontWeight: "bold",
        fontSize: 14,
    },
    statusHint: {
        fontSize: 12,
        color: "#888",
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: "#C88EA7",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#C88EA7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    primaryButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: "#ddd",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        backgroundColor: "#fff",
    },
    secondaryButtonText: {
        color: "#555",
        fontSize: 16,
    },
});
