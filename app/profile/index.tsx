import { customerAPI } from '@/api/api';
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

export default function ProfilePage() {
    const { user, logout, refreshUser, loading: authLoading } = useAuth();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

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

    const handleLogout = async () => {
        await logout();
    };

    if (authLoading || !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Profile</Text>
                    <Pressable onPress={handleLogout} style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </Pressable>
                </View>

                {/* Profile Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Personal Information</Text>
                        {!isEditing ? (
                            <Pressable onPress={() => setIsEditing(true)}>
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable onPress={() => setIsEditing(false)} disabled={loading}>
                                    <Text style={[styles.editLink, { color: '#666' }]}>Cancel</Text>
                                </Pressable>
                            </View>
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
                        <Text style={[styles.value, { color: '#888' }]}>{user.email}</Text>
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
                                placeholder="Shipping Address"
                                multiline
                                numberOfLines={3}
                            />
                        ) : (
                            <Text style={styles.value}>{user.address || 'Not provided'}</Text>
                        )}
                    </View>

                    {isEditing && (
                        <Pressable
                            style={[styles.saveButton, loading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </Pressable>
                    )}
                </View>

                {/* Order History Link */}
                <Pressable
                    style={styles.menuItem}
                    onPress={() => router.push('/profile/orders' as RelativePathString)}
                >
                    <Text style={styles.menuItemText}>📦  Order History</Text>
                    <Text style={styles.chevron}>›</Text>
                </Pressable>

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
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: '#B36979',
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 15,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    editLink: {
        color: '#C88EA7',
        fontWeight: '600',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#888',
        marginBottom: 6,
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#C88EA7',
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
    menuItem: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 1,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    chevron: {
        fontSize: 20,
        color: '#ccc',
        fontWeight: 'bold',
    }
});
