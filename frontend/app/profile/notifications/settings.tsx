import { notificationAPI, NotificationSettings } from '@/api/api';
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
    Switch,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingItemProps {
    icon: string;
    title: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    description,
    value,
    onChange,
    disabled,
}) => (
    <View style={styles.settingItem}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            <Text style={styles.settingDescription}>{description}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            trackColor={{ false: '#ddd', true: '#E8C4D0' }}
            thumbColor={value ? '#C88EA7' : '#f4f3f4'}
        />
    </View>
);

export default function NotificationSettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        } else if (user) {
            fetchSettings();
        }
    }, [user, authLoading]);

    const fetchSettings = async () => {
        try {
            const response = await notificationAPI.getSettings();
            setSettings(response.data.settings);
        } catch (error) {
            console.error('Error fetching settings:', error);
            Alert.alert('Error', 'Failed to load notification settings');
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (key: keyof Pick<NotificationSettings, 'orderUpdates' | 'promotions' | 'systemMessages'>, value: boolean) => {
        if (!settings) return;

        // Optimistically update UI
        setSettings(prev => prev ? { ...prev, [key]: value } : null);
        setSaving(true);

        try {
            const response = await notificationAPI.updateSettings({ [key]: value });
            setSettings(response.data.settings);
        } catch (error) {
            // Revert on error
            setSettings(prev => prev ? { ...prev, [key]: !value } : null);
            console.error('Error updating settings:', error);
            Alert.alert('Error', 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading || authLoading) {
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
                    <Text style={styles.title}>Notification Settings</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Push Notifications</Text>
                    <Text style={styles.cardDescription}>
                        Choose what notifications you want to receive from Knot & Bloom.
                    </Text>

                    <View style={styles.settingsList}>
                        <SettingItem
                            icon="📦"
                            title="Order Updates"
                            description="Get notified about your order status, shipping, and delivery"
                            value={settings?.orderUpdates ?? true}
                            onChange={(value) => updateSetting('orderUpdates', value)}
                            disabled={saving}
                        />

                        <View style={styles.divider} />

                        <SettingItem
                            icon="🎉"
                            title="Promotions & Deals"
                            description="Receive exclusive offers, discounts, and sale announcements"
                            value={settings?.promotions ?? true}
                            onChange={(value) => updateSetting('promotions', value)}
                            disabled={saving}
                        />

                        <View style={styles.divider} />

                        <SettingItem
                            icon="🔔"
                            title="System Messages"
                            description="Important updates about your account and app features"
                            value={settings?.systemMessages ?? true}
                            onChange={(value) => updateSetting('systemMessages', value)}
                            disabled={saving}
                        />
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        Turning off all notifications may cause you to miss important order updates.
                        We recommend keeping at least "Order Updates" enabled.
                    </Text>
                </View>

                {saving && (
                    <View style={styles.savingIndicator}>
                        <ActivityIndicator size="small" color="#C88EA7" />
                        <Text style={styles.savingText}>Saving...</Text>
                    </View>
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
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
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
        marginBottom: 20,
    },
    settingsList: {
        gap: 0,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    settingIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 13,
        color: '#666',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    infoIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#1976D2',
        lineHeight: 18,
    },
    savingIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 8,
    },
    savingText: {
        color: '#888',
        fontSize: 14,
    },
});
