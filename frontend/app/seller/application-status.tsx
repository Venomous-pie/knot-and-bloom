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
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, FileText, Info } from "lucide-react-native";
import { theme } from '@/constants/theme';

export default function ApplicationStatusPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

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

    const confirmCancel = async () => {
        try {
            setIsCancelling(true);
            await sellerAPI.cancelApplication();
            await refreshUser();
            setCancelModalVisible(false);
            if (Platform.OS !== 'web') {
                Alert.alert("Success", "Application cancelled successfully.");
            } else {
                alert("Application cancelled successfully.");
            }
        } catch (error) {
            if (Platform.OS !== 'web') {
                Alert.alert("Error", "Failed to cancel application.");
            } else {
                alert("Failed to cancel application.");
            }
        } finally {
            setIsCancelling(false);
        }
    };

    if (authLoading || !user) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    const sellerStatus = user.sellerStatus || "NONE";

    const renderCancelModal = () => (
        <Modal
            animationType="none"
            transparent={true}
            visible={cancelModalVisible}
            onRequestClose={() => setCancelModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIconWrapper}>
                        <AlertCircle size={32} color={theme.colors.error} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.modalTitle}>Cancel Application</Text>
                    <Text style={styles.modalMessage}>
                        Are you sure you want to cancel your seller application? This action cannot be undone.
                    </Text>
                    <View style={styles.modalActions}>
                        <Pressable 
                            style={styles.modalCancelBtn}
                            onPress={() => setCancelModalVisible(false)}
                            disabled={isCancelling}
                        >
                            <Text style={styles.modalCancelBtnText}>No, Keep It</Text>
                        </Pressable>
                        <Pressable 
                            style={styles.modalConfirmBtn}
                            onPress={confirmCancel}
                            disabled={isCancelling}
                        >
                            {isCancelling ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.modalConfirmBtnText}>Yes, Cancel</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderStatusContent = () => {
        switch (sellerStatus) {
            case "PENDING":
                return (
                    <View style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconBackground, { backgroundColor: theme.colors.warning + '20' }]}>
                                <Clock size={40} color={theme.colors.warning} strokeWidth={2.5} />
                            </View>
                        </View>
                        <Text style={styles.title}>Under Review</Text>
                        <Text style={styles.subtitle}>
                            Thanks for applying! Our team is currently reviewing your shop details. This usually takes 1-2 business days.
                        </Text>
                        
                        <View style={styles.buttonContainer}>
                            <Pressable 
                                style={({ pressed, hovered }: any) => [
                                    styles.primaryBtn,
                                    hovered && { backgroundColor: theme.colors.primary },
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={handleRefresh} 
                                disabled={refreshing}
                            >
                                {refreshing ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.primaryBtnText}>Refresh Status</Text>
                                )}
                            </Pressable>

                                <Pressable 
                                style={({ pressed, hovered }: any) => [
                                    styles.destructiveBtn,
                                    hovered && { backgroundColor: theme.colors.subtle },
                                    pressed && { backgroundColor: theme.colors.background }
                                ]}
                                onPress={() => setCancelModalVisible(true)}
                            >
                                <Text style={styles.destructiveBtnText}>Cancel Application</Text>
                            </Pressable>
                        </View>
                    </View>
                );
            case "APPROVED":
            case "ACTIVE":
                return (
                    <View style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconBackground, { backgroundColor: theme.colors.success + '20' }]}>
                                <CheckCircle size={40} color={theme.colors.success} strokeWidth={2.5} />
                            </View>
                        </View>
                        <Text style={styles.title}>Application Approved!</Text>
                        <Text style={styles.subtitle}>
                            Congratulations! Your shop is ready to go. Welcome to our curated marketplace of local makers.
                        </Text>
                        
                        <View style={[styles.buttonContainer, { marginTop: 24 }]}>
                            <Pressable
                                style={({ pressed, hovered }: any) => [
                                    styles.primaryBtn,
                                    hovered && { backgroundColor: theme.colors.primary },
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push("/seller-dashboard/" as RelativePathString)}
                            >
                                <Text style={styles.primaryBtnText}>Go to Seller Dashboard</Text>
                                <ArrowRight size={18} color="white" />
                            </Pressable>
                        </View>
                    </View>
                );
            case "REJECTED":
                return (
                    <View style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconBackground, { backgroundColor: theme.colors.error + '20' }]}>
                                <AlertCircle size={40} color={theme.colors.error} strokeWidth={2.5} />
                            </View>
                        </View>
                        <Text style={styles.title}>Application Update</Text>
                        <Text style={styles.subtitle}>
                            Unfortunately, we couldn't approve your application at this time.
                        </Text>
                        
                        <View style={styles.rejectionBox}>
                            <Info size={18} color={theme.colors.errorDark} style={{ marginTop: 2 }} />
                            <Text style={styles.rejectionReasonText}>
                                {user.sellerRejectionReason || "Information provided was incomplete. Please update your details and try again."}
                            </Text>
                        </View>
                        
                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={({ pressed, hovered }: any) => [
                                    styles.primaryBtn,
                                    hovered && { backgroundColor: theme.colors.primary },
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push("/seller/apply" as RelativePathString)}
                            >
                                <Text style={styles.primaryBtnText}>Update Application</Text>
                            </Pressable>

                                <Pressable 
                                style={({ pressed, hovered }: any) => [
                                    styles.destructiveBtn,
                                    hovered && { backgroundColor: theme.colors.subtle },
                                    pressed && { backgroundColor: theme.colors.background }
                                ]}
                                onPress={() => setCancelModalVisible(true)}
                            >
                                <Text style={styles.destructiveBtnText}>Cancel Application</Text>
                            </Pressable>
                        </View>
                    </View >
                );
            default:
                return (
                    <View style={styles.card}>
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconBackground, { backgroundColor: theme.colors.border }]}>
                                <FileText size={40} color={theme.colors.textSecondary} strokeWidth={2.5} />
                            </View>
                        </View>
                        <Text style={styles.title}>No Application Found</Text>
                        <Text style={styles.subtitle}>
                            You haven't submitted a seller application yet. Join our community of makers!
                        </Text>
                        
                        <View style={[styles.buttonContainer, { marginTop: 24 }]}>
                            <Pressable
                                style={({ pressed, hovered }: any) => [
                                    styles.primaryBtn,
                                    hovered && { backgroundColor: theme.colors.primary },
                                    pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                ]}
                                onPress={() => router.push("/seller/apply" as RelativePathString)}
                            >
                                <Text style={styles.primaryBtnText}>Apply Now</Text>
                                <ArrowRight size={18} color="white" />
                            </Pressable>
                        </View>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Seller Application</Text>
                </View>

                {renderStatusContent()}
                {renderCancelModal()}

                <Pressable style={styles.backLink} onPress={() => router.push("/profile")}>
                    <ArrowLeft size={16} color={theme.colors.textSecondary} />
                    <Text style={styles.backLinkText}>Return to Profile</Text>
                </Pressable>
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
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        alignItems: "center",
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    card: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        alignItems: "center",
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: "center",
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
        fontFamily: 'Quicksand',
    },
    timeline: {
        width: '100%',
        marginTop: 8,
        paddingLeft: 12,
    },
    timelineStep: {
        flexDirection: 'row',
        marginBottom: 24,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 7,
        top: 20,
        bottom: -24,
        width: 2,
        backgroundColor: theme.colors.border,
        zIndex: 0,
    },
    timelineDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: theme.colors.border,
        marginTop: 2,
        marginRight: 16,
        zIndex: 1,
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 2,
    },
    timelineDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: theme.colors.border,
        marginVertical: 24,
    },
    rejectionBox: {
        flexDirection: 'row',
        backgroundColor: theme.colors.errorLight,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        width: "100%",
        gap: 12,
        alignItems: 'flex-start',
    },
    rejectionReasonText: {
        fontSize: 13,
        color: theme.colors.errorDark,
        flex: 1,
        lineHeight: 20,
        fontFamily: 'Quicksand',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    primaryBtn: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryBtnText: {
        color: theme.colors.primaryText,
        fontSize: 15,
        fontWeight: "700",
        fontFamily: 'Quicksand',
    },
    destructiveBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    destructiveBtnText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
        fontFamily: 'Quicksand',
    },
    backLink: {
        marginTop: 32,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'center',
        gap: 8,
    },
    backLinkText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.error + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        fontFamily: 'Quicksand',
    },
    modalActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    modalCancelBtnText: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirmBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
});
