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
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>Personal Information</Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Profile Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Your Details</Text>
                        {!isEditing ? (
                            <Pressable onPress={() => setIsEditing(true)}>
                                <Text style={styles.editLink}>Edit</Text>
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => setIsEditing(false)} disabled={loading}>
                                <Text style={[styles.editLink, { color: '#666' }]}>Cancel</Text>
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
                        <Text style={[styles.value, { color: '#888' }]}>{user.email || 'Not provided'}</Text>
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

                    {user.sellerId && user.sellerStatus && (
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Seller Status</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.value, {
                                    color: user.sellerStatus === 'ACTIVE' ? 'green' :
                                        user.sellerStatus === 'PENDING' ? '#B8860B' :
                                            user.sellerStatus === 'SUSPENDED' ? 'red' : '#333',
                                    fontWeight: 'bold'
                                }]}>
                                    {user.sellerStatus === 'PENDING' ? 'Pending Approval' : user.sellerStatus.charAt(0) + user.sellerStatus.slice(1).toLowerCase()}
                                </Text>
                                {user.sellerStatus === 'PENDING' && <Text>⏳</Text>}
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
                </View>
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
    hint: {
        fontSize: 12,
        color: '#aaa',
        marginTop: 4,
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
});
