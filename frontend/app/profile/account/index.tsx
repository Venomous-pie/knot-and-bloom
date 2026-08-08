import { customerAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { ProfilePageLayout, ProfileCard } from '@/components/profile/ProfilePageLayout';

export default function PersonalInfoPage() {
    const { user, refreshUser, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    useEffect(() => {
        refreshUser();
    }, []);

    useEffect(() => {
        if (!user && !authLoading) {
            router.replace('/auth/login' as RelativePathString);
            return;
        }

        if (user) {
            setName(user.name || '');
            setPhone(user.phone || '');
            setAddress(user.address || '');
        }
    }, [user, authLoading]);

    const handleSave = async () => {
        setLoading(true);
        try {
            await customerAPI.updateProfile({
                name,
                phone,
                address
            });
            await refreshUser();
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully");
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            </View>
        );
    }

    return (
        <ProfilePageLayout title="Personal Information">
            {/* Profile Card */}
            <ProfileCard>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Your Details</Text>
                        {!isEditing ? (
                            <Pressable onPress={() => setIsEditing(true)}>
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => setIsEditing(false)} disabled={loading}>
                                <Text style={[styles.editLink, { color: theme.colors.textSecondary }]}>Cancel</Text>
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Name</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                            />
                        ) : (
                            <Text style={styles.value}>{user.name}</Text>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={[styles.value, { color: theme.colors.textLight }]}>{user.email || 'Not provided'}</Text>
                        <Text style={styles.hint}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Phone</Text>
                        {isEditing ? (
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="Phone Number"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.value}>{user.phone || 'Not provided'}</Text>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Address</Text>
                        {isEditing ? (
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Default Address"
                                multiline
                                numberOfLines={3}
                            />
                        ) : (
                            <Text style={styles.value}>{user.address || 'Not provided'}</Text>
                        )}
                    </View>

                    {user.sellerProfile?.uid && user.sellerProfile?.status && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Seller Status</Text>
                            <View style={[styles.statusBadge, { backgroundColor: user.sellerProfile?.status === 'ACTIVE' ? '#E8F5E9' : user.sellerProfile?.status === 'REJECTED' ? theme.colors.errorLight : '#FFF3E0' }]}>
                                <Text style={[styles.statusText, { color: user.sellerProfile?.status === 'ACTIVE' ? theme.colors.success : user.sellerProfile?.status === 'REJECTED' ? theme.colors.error : theme.colors.warning }]}>
                                    {user.sellerProfile?.status === 'ACTIVE' ? '✓ Active Seller' : user.sellerProfile?.status === 'REJECTED' ? '❌ Application Rejected' : '⏳ Pending Approval'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {isEditing && (
                        <Pressable
                            style={[styles.saveButton, loading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </Pressable>
                    )}
            </ProfileCard>
        </ProfilePageLayout>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    editLink: {
        color: theme.colors.primaryLight,
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledButton: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
