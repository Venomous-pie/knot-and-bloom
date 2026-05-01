import { sellerAPI } from "@/api/api";
import { useAuth } from "@/contexts/AuthContext";
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
import { theme } from '@/constants/theme';

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
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    const sellerStatus = user.sellerStatus || "NONE";

    const renderStatusContent = () => {
        switch (sellerStatus) {
            case "PENDING":
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: '#FFF4E5' }]}>
                            <Ionicons name="time" size={48} color="#FF9800" />
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
                            <Pressable 
                                style={[styles.actionButton, styles.primaryButton]} 
                                onPress={handleRefresh} 
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.actionButtonText}>Refresh Status</Text>
                                )}
                            </Pressable>

                            <Pressable style={styles.cancelLink} onPress={handleCancel}>
                                <Text style={styles.cancelLinkText}>Cancel Application</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            case "APPROVED":
            case "ACTIVE":
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.success + '20' }]}>
                            <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
                        </View>
                        <Text style={styles.statusTitle}>Application Approved!</Text>
                        <Text style={styles.statusMessage}>
                            Congratulations! Your shop is ready to go. Welcome to our curated marketplace of local makers.
                        </Text>
                        <Pressable
                            style={[styles.actionButton, styles.primaryButton, { marginTop: theme.spacing.lg }]}
                            onPress={() => router.push("/seller-dashboard/" as RelativePathString)}
                        >
                            <Text style={styles.actionButtonText}>Go to Seller Dashboard</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
                        </Pressable>
                    </View>
                );
            case "REJECTED":
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.errorLight }]}>
                            <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
                        </View>
                        <Text style={styles.statusTitle}>Application Update</Text>
                        <Text style={styles.statusMessage}>
                            Unfortunately, we couldn't approve your application at this time.
                        </Text>
                        <View style={styles.rejectionBox}>
                            <Ionicons name="information-circle-outline" size={20} color={theme.colors.errorDark} />
                            <Text style={styles.rejectionReasonText}>
                                {user.sellerRejectionReason || "Information provided was incomplete. Please update your details and try again."}
                            </Text>
                        </View>
                        
                        <View style={styles.buttonGroup}>
                            <Pressable
                                style={[styles.actionButton, styles.primaryButton]}
                                onPress={() => router.push("/seller/apply" as RelativePathString)}
                            >
                                <Text style={styles.actionButtonText}>Update Application</Text>
                            </Pressable>

                            <Pressable style={styles.cancelLink} onPress={handleCancel}>
                                <Text style={styles.cancelLinkText}>Cancel Application</Text>
                            </Pressable>
                        </View>
                    </View >
                );
            default:
                return (
                    <View style={styles.statusCard}>
                        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.subtle }]}>
                            <Ionicons name="document-text" size={48} color={theme.colors.textSecondary} />
                        </View>
                        <Text style={styles.statusTitle}>No Application Found</Text>
                        <Text style={styles.statusMessage}>
                            You haven't submitted a seller application yet. Join our community of makers!
                        </Text>
                        <Pressable
                            style={[styles.actionButton, styles.primaryButton, { marginTop: theme.spacing.lg }]}
                            onPress={() => router.push("/seller/apply" as RelativePathString)}
                        >
                            <Text style={styles.actionButtonText}>Apply Now</Text>
                            <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />
                        </Pressable>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentWrapper}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Seller Application</Text>
                    </View>

                    {renderStatusContent()}

                    <Pressable style={styles.backLink} onPress={() => router.push("/")}>
                        <Ionicons name="arrow-back" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.backLinkText}>Return to Storefront</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: theme.spacing.lg,
        justifyContent: 'center',
    },
    contentWrapper: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    headerTitle: {
        fontSize: theme.typography.sizes['2xl'],
        fontWeight: "bold",
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    statusCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing['2xl'],
        alignItems: "center",
        width: "100%",
        ...theme.shadows.md,
    },
    iconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    statusTitle: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: "center",
        fontFamily: theme.typography.fontFamily,
    },
    statusMessage: {
        fontSize: theme.typography.sizes.base,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 24,
        marginBottom: theme.spacing.md,
        fontFamily: theme.typography.fontFamily,
    },
    noteText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textLight,
        textAlign: "center",
        fontFamily: theme.typography.fontFamily,
    },
    rejectionBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.errorLight,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xl,
        width: "100%",
        gap: theme.spacing.sm,
        alignItems: 'flex-start',
    },
    rejectionReasonText: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.errorDark,
        flex: 1,
        lineHeight: 20,
        fontFamily: theme.typography.fontFamily,
    },
    buttonGroup: {
        marginTop: theme.spacing.lg,
        width: '100%',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    actionButton: {
        flexDirection: 'row',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.md,
        width: '100%',
        justifyContent: 'center',
        alignItems: "center",
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.sm,
    },
    actionButtonText: {
        color: "white",
        fontSize: theme.typography.sizes.base,
        fontWeight: "600",
        fontFamily: theme.typography.fontFamily,
    },
    cancelLink: {
        padding: theme.spacing.sm,
    },
    cancelLinkText: {
        color: theme.colors.textLight,
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    backLink: {
        marginTop: theme.spacing.xl,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'center',
        gap: theme.spacing.sm,
    },
    backLinkText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
});
