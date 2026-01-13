import { sellerAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ApplicationStatusPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/auth/login" as RelativePathString);
        }
    }, [user, authLoading]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshUser();
        setRefreshing(false);
    };

    const handleCancel = async () => {
        Alert.alert(
            "Cancel Application",
            "Are you sure you want to cancel your seller application? This action cannot be undone.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setRefreshing(true);
                            await sellerAPI.cancelApplication();
                            await refreshUser();
                            Alert.alert("Success", "Application cancelled successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to cancel application.");
                        } finally {
                            setRefreshing(false);
                        }
                    }
                }
            ]
        );
    };

    if (authLoading || !user) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </SafeAreaView>
        );
    }

    const sellerStatus = user.sellerStatus || "NONE";

    const renderStatusContent = () => {
        switch (sellerStatus) {
            case "PENDING":
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconContainer, { backgroundColor: "#FFF4E5" }]}>
                            <Ionicons name="time-outline" size={64} color="#FF9800" />
                        </View>
                        <Text style={styles.statusTitle}>Under Review</Text>
                        <Text style={styles.statusMessage}>
                            Thanks for applying! Our team is currently reviewing your shop details.
                            This usually takes 1-2 business days.
                        </Text>
                        <Text style={styles.noteText}>
                            We'll verify your information and notify you via SMS/Email once approved.
                        </Text>

                        <View style={styles.buttonGroup}>
                            <Pressable style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
                                {refreshing ? <ActivityIndicator color="#666" size="small" /> : <Ionicons name="refresh-outline" size={20} color="#666" />}
                                <Text style={styles.refreshButtonText}>Check Status</Text>
                            </Pressable>

                            <Pressable style={styles.cancelLink} onPress={handleCancel}>
                                <Text style={styles.cancelLinkText}>Cancel Application</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            case "APPROVED":
            case "ACTIVE": // Assuming ACTIVE is the approved state
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconContainer, { backgroundColor: "#E6F4EA" }]}>
                            <Ionicons name="checkmark-circle-outline" size={64} color="#34A853" />
                        </View>
                        <Text style={styles.statusTitle}>Application Approved!</Text>
                        <Text style={styles.statusMessage}>
                            Congratulations! Your shop is ready to go.
                        </Text>
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => router.push("/seller-dashboard/" as RelativePathString)}
                        >
                            <Text style={styles.actionButtonText}>Go to Seller Dashboard</Text>
                        </Pressable>
                    </View>
                );
            case "REJECTED":
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconContainer, { backgroundColor: "#FDECEA" }]}>
                            <Ionicons name="alert-circle-outline" size={64} color="#D93025" />
                        </View>
                        <Text style={styles.statusTitle}>Application Update</Text>
                        <Text style={styles.statusMessage}>
                            Unfortunately, we couldn't approve your application at this time.
                        </Text>
                        <Text style={styles.rejectionReason}>
                            Reason: {(user as any).sellerRejectionReason || "Information provided was incomplete."}
                        </Text>
                        <Pressable
                            style={[styles.actionButton, styles.secondaryButton]}
                            onPress={() => router.push("/seller/apply" as RelativePathString)}
                        >
                            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Update Application</Text>
                        </Pressable>

                        <Pressable style={styles.cancelLink} onPress={handleCancel}>
                            <Text style={styles.cancelLinkText}>Cancel Application</Text>
                        </Pressable>
                    </View >
                );
            default:
                return (
                    <View style={styles.statusCard}>
                        <Text style={styles.statusTitle}>No Application Found</Text>
                        <Text style={styles.statusMessage}>
                            You haven't submitted a seller application yet.
                        </Text>
                        <Pressable
                            style={styles.actionButton}
                            onPress={() => router.push("/seller/apply" as RelativePathString)}
                        >
                            <Text style={styles.actionButtonText}>Apply Now</Text>
                        </Pressable>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Application Status</Text>
                </View>

                <View style={styles.content}>
                    {renderStatusContent()}
                </View>

                <Pressable style={styles.backLink} onPress={() => router.push("/")}>
                    <Text style={styles.backLinkText}>← Back to Home</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9F9F9",
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
    },
    header: {
        marginBottom: 40,
        alignItems: "center",
        marginTop: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    content: {
        alignItems: "center",
        maxWidth: 600,
        width: "100%",
        alignSelf: "center",
    },
    statusCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 40,
        alignItems: "center",
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    statusTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 16,
        textAlign: "center",
    },
    statusMessage: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 24,
    },
    noteText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        fontStyle: "italic",
    },
    rejectionReason: {
        fontSize: 15,
        color: "#D93025",
        backgroundColor: "#FDECEA",
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
        textAlign: "center",
        width: "100%",
    },
    actionButton: {
        backgroundColor: "#B36979",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        marginTop: 10,
        minWidth: 200,
        alignItems: "center",
    },
    actionButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    secondaryButton: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#B36979",
    },
    secondaryButtonText: {
        color: "#B36979",
    },
    buttonGroup: {
        marginTop: 20,
        gap: 16,
        alignItems: 'center',
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        gap: 8,
    },
    refreshButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    cancelLink: {
        padding: 10,
        marginTop: 10,
    },
    cancelLinkText: {
        color: '#999',
        textDecorationLine: 'underline',
        fontSize: 14,
    },
    backLink: {
        marginTop: 40,
        alignItems: "center",
    },
    backLinkText: {
        color: "#888",
        fontSize: 14,
    },
});
