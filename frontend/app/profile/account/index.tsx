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
    View,
    Image,
    Linking
} from 'react-native';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '@/lib/imagekit';
import ImageCropperModal from '@/components/seller/ImageCropperModal';
import { ProfilePageLayout, ProfileCard } from '@/components/profile/ProfilePageLayout';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { addressAPI, Address } from '@/services/address';

export default function PersonalInfoPage() {
    const { user, refreshUser, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
    const [fetchingAddress, setFetchingAddress] = useState(false);

    // Image Upload State
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [cropperVisible, setCropperVisible] = useState(false);
    const [imageUriToCrop, setImageUriToCrop] = useState<string | null>(null);

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
            setAvatar(user.avatar || null);
            fetchAddresses();
        }
    }, [user, authLoading]);

    const fetchAddresses = async () => {
        try {
            setFetchingAddress(true);
            const res = await addressAPI.getAddresses();
            if (res.data?.addresses) {
                const def = res.data.addresses.find(a => a.isDefault);
                setDefaultAddress(def || res.data.addresses[0] || null);
            }
        } catch (error) {
            console.error("Failed to fetch address", error);
        } finally {
            setFetchingAddress(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await customerAPI.updateProfile({
                name,
                phone,
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

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // We use our own cropper
                quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
                setImageUriToCrop(result.assets[0].uri);
                setCropperVisible(true);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to open image picker");
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        setCropperVisible(false);
        setImageUriToCrop(null);
        setIsUploadingImage(true);
        
        try {
            const fileName = `avatar_${Date.now()}.jpg`;
            const uploadResult = await uploadToImageKit(
                { uri: croppedUri, name: fileName },
                { folder: "avatars" }
            );
            setAvatar(uploadResult.url);
            
            // Auto-save just the avatar if not in edit mode
            if (!isEditing) {
                // Since updateProfile does not accept avatar directly, we skip it
                // and wait for user to click Save Changes to sync to backend (requires API update)
                // Or if customerAPI has it:
                // await customerAPI.updateProfile({ avatar: uploadResult.url });
                await refreshUser();
            }
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert("Upload Failed", "Failed to upload avatar image");
        } finally {
            setIsUploadingImage(false);
        }
    };

    if (authLoading || !user) {
        return (
            <ProfilePageLayout title="Personal Information">
                <ProfileSkeleton />
            </ProfilePageLayout>
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
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            {isUploadingImage ? (
                                <View style={styles.avatarLoading}>
                                    <ActivityIndicator color={theme.colors.primary} />
                                </View>
                            ) : avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarPlaceholderText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
                                </View>
                            )}
                            
                            {(isEditing || true) && (
                                <Pressable style={styles.avatarEditButton} onPress={handlePickImage} disabled={isUploadingImage}>
                                    <Camera size={16} color="white" />
                                </Pressable>
                            )}
                        </View>
                        <View style={styles.avatarInfo}>
                            <Text style={styles.avatarTitle}>Profile Picture</Text>
                            <Text style={styles.avatarHint}>JPG, GIF or PNG. Max size of 800K</Text>
                        </View>
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
                        <View style={styles.addressHeaderRow}>
                            <Text style={styles.label}>Default Address</Text>
                            {isEditing && (
                                <Pressable onPress={() => router.push('/profile/account/addresses' as RelativePathString)}>
                                    <Text style={styles.editAddressLink}>Manage Addresses</Text>
                                </Pressable>
                            )}
                        </View>
                        {fetchingAddress ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ alignSelf: 'flex-start' }} />
                        ) : defaultAddress ? (
                            <View style={styles.addressBox}>
                                <Text style={styles.addressName}>{defaultAddress.fullName || user.name}</Text>
                                <Text style={styles.addressText}>{defaultAddress.streetAddress}</Text>
                                <Text style={styles.addressText}>{defaultAddress.city}, {defaultAddress.province}</Text>
                                <Text style={styles.addressText}>{defaultAddress.phone || user.phone}</Text>
                            </View>
                        ) : (
                            <Text style={styles.value}>{user.address || 'No address set'}</Text>
                        )}
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Member Since</Text>
                            <Text style={styles.statValue}>
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Trust Score</Text>
                            <Text style={[styles.statValue, { color: theme.colors.success }]}>
                                {user.trustScore ?? 100}
                            </Text>
                        </View>
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
            
            {imageUriToCrop && (
                <ImageCropperModal
                    visible={cropperVisible}
                    imageUri={imageUriToCrop}
                    onSkip={() => {
                        setCropperVisible(false);
                        setImageUriToCrop(null);
                    }}
                    onCancel={() => {
                        setCropperVisible(false);
                        setImageUriToCrop(null);
                    }}
                    onCrop={handleCropComplete}
                />
            )}
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
    avatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F5F5F5',
        marginRight: 20,
        position: 'relative',
    },
    avatarLoading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 40,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarPlaceholderText: {
        fontSize: 32,
        color: 'white',
        fontWeight: 'bold',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    avatarInfo: {
        flex: 1,
    },
    avatarTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    avatarHint: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    editLink: {
        color: theme.colors.primary,
        fontWeight: 'bold',
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
    addressHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    editAddressLink: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    addressBox: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    addressName: {
        fontWeight: 'bold',
        fontSize: 15,
        color: theme.colors.text,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: '80%',
        backgroundColor: theme.colors.border,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
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
