import { accountAPI } from '@/api/api';
import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DELETION_REASONS = [
    'Not using the app anymore',
    'Privacy concerns',
    'Too many notifications',
    'Found a better alternative',
    'Other',
];

export default function DeleteAccountPage() {
    const { user, loading: authLoading, logout } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [deletionStatus, setDeletionStatus] = useState<{
        hasPendingDeletion: boolean;
        deletionRequestedAt?: string | null;
        deletionScheduledFor?: string | null;
    }>({ hasPendingDeletion: false });

    const [selectedReason, setSelectedReason] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchDeletionStatus();
        }
    }, [user, authLoading]);

    const fetchDeletionStatus = async () => {
        try {
            const response = await accountAPI.getDeletionStatus();
            setDeletionStatus(response.data);
        } catch (error) {
            console.error('Error fetching deletion status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeletion = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password to confirm');
            return;
        }

        Alert.alert(
            'Confirm Account Deletion',
            'Your account will be scheduled for deletion in 7 days. You can cancel this by logging in again before the deletion date.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Deletion',
                    style: 'destructive',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const response = await accountAPI.requestDeletion({
                                reason: selectedReason || undefined,
                                password: password.trim(),
                            });
                            Alert.alert(
                                'Deletion Scheduled',
                                `Your account is scheduled for deletion on ${new Date(response.data.deletionScheduledFor).toLocaleDateString()}. You can cancel this by logging in before that date.`,
                                [{ text: 'OK', onPress: () => router.back() }]
                            );
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to request account deletion');
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancelDeletion = async () => {
        Alert.alert(
            'Cancel Deletion',
            'Are you sure you want to cancel the account deletion request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await accountAPI.cancelDeletion();
                            Alert.alert('Success', 'Account deletion has been cancelled');
                            await fetchDeletionStatus();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to cancel deletion');
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading || authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    const daysRemaining = deletionStatus.deletionScheduledFor
        ? Math.ceil((new Date(deletionStatus.deletionScheduledFor).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>Account Deletion</Text>
                    <View style={{ width: 60 }} />
                </View>

                {deletionStatus.hasPendingDeletion ? (
                    /* Pending Deletion State */
                    <View style={styles.pendingCard}>
                        <View style={styles.warningIcon}>
                            <Text style={styles.warningIconText}>⚠️</Text>
                        </View>
                        <Text style={styles.pendingTitle}>Deletion Scheduled</Text>
                        <Text style={styles.pendingText}>
                            Your account is scheduled for permanent deletion on{' '}
                            <Text style={styles.pendingDate}>
                                {deletionStatus.deletionScheduledFor
                                    ? new Date(deletionStatus.deletionScheduledFor).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })
                                    : 'soon'}
                            </Text>
                        </Text>
                        <Text style={styles.pendingDays}>
                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Deletion imminent'}
                        </Text>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoTitle}>What happens when your account is deleted?</Text>
                            <Text style={styles.infoItem}>• Your profile data will be permanently removed</Text>
                            <Text style={styles.infoItem}>• Your saved addresses and payment methods will be deleted</Text>
                            <Text style={styles.infoItem}>• Order history will be anonymized but kept for records</Text>
                            <Text style={styles.infoItem}>• You won't be able to recover your account</Text>
                        </View>

                        <Pressable
                            style={[styles.cancelButton, submitting && styles.disabledButton]}
                            onPress={handleCancelDeletion}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#4CAF50" />
                            ) : (
                                <Text style={styles.cancelButtonText}>Cancel Deletion Request</Text>
                            )}
                        </Pressable>
                    </View>
                ) : (
                    /* Request Deletion State */
                    <>
                        <View style={styles.warningBanner}>
                            <Text style={styles.warningBannerIcon}>⚠️</Text>
                            <Text style={styles.warningBannerText}>
                                Account deletion is permanent and cannot be undone after 7 days.
                            </Text>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Request Account Deletion</Text>
                            <Text style={styles.cardDescription}>
                                We're sorry to see you go. Before you delete your account, please note:
                            </Text>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoItem}>• Your account will be scheduled for deletion in 7 days</Text>
                                <Text style={styles.infoItem}>• You can cancel the deletion by logging in within 7 days</Text>
                                <Text style={styles.infoItem}>• All your personal data will be permanently deleted</Text>
                                <Text style={styles.infoItem}>• Order history will be kept but anonymized</Text>
                            </View>

                            <Text style={styles.formLabel}>Why are you leaving? (Optional)</Text>
                            <View style={styles.reasonButtons}>
                                {DELETION_REASONS.map((reason) => (
                                    <Pressable
                                        key={reason}
                                        style={[styles.reasonButton, selectedReason === reason && styles.reasonButtonActive]}
                                        onPress={() => setSelectedReason(selectedReason === reason ? '' : reason)}
                                    >
                                        <Text style={[styles.reasonButtonText, selectedReason === reason && styles.reasonButtonTextActive]}>
                                            {reason}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.formLabel}>Enter your password to confirm *</Text>
                            <TextInput
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Your password"
                                secureTextEntry
                            />

                            <Pressable
                                style={[styles.deleteButton, submitting && styles.disabledButton]}
                                onPress={handleRequestDeletion}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.deleteButtonText}>Request Account Deletion</Text>
                                )}
                            </Pressable>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    warningBanner: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    warningBannerIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    warningBannerText: {
        flex: 1,
        fontSize: 14,
        color: '#E65100',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    infoBox: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    infoItem: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    reasonButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    reasonButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    reasonButtonActive: {
        borderColor: '#E53935',
        backgroundColor: '#FFEBEE',
    },
    reasonButtonText: {
        fontSize: 13,
        color: '#666',
    },
    reasonButtonTextActive: {
        color: '#E53935',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    deleteButton: {
        backgroundColor: '#E53935',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    },
    pendingCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    warningIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    warningIconText: {
        fontSize: 32,
    },
    pendingTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 8,
    },
    pendingText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    pendingDate: {
        fontWeight: '600',
        color: '#333',
    },
    pendingDays: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF5722',
        marginBottom: 20,
    },
    cancelButton: {
        backgroundColor: '#E8F5E9',
        borderWidth: 2,
        borderColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    cancelButtonText: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
