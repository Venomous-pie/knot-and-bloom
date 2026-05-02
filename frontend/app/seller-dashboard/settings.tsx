import React, { useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, Lock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useSellerSettings } from '@/contexts/SellerSettingsContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SellerSettingsPage() {
    const router = useRouter();
    const { settings, updateSetting } = useSellerSettings();
    const { user, loading: authLoading } = useAuth();

    // Auth guard: only ACTIVE sellers or admins can access
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerId && user.sellerStatus === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Seller Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* AI Features Section */}
                <Text style={styles.sectionLabel}>AI Features</Text>
                <View style={styles.card}>
                    {/* AI Description Toggle */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIcon}>
                            <Sparkles size={20} color={theme.colors.primary} />
                        </View>
                        <View style={styles.settingInfo}>
                            <View style={styles.settingTitleRow}>
                                <Text style={styles.settingTitle}>AI Description Generator</Text>
                                <View style={styles.premiumBadge}>
                                    <Lock size={10} color="#fff" />
                                    <Text style={styles.premiumBadgeText}>Premium</Text>
                                </View>
                            </View>
                            <Text style={styles.settingSubtitle}>
                                Use AI to automatically generate compelling product descriptions from your product name and category.
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                            thumbColor="#fff"
                            onValueChange={(val) => updateSetting('aiDescriptionEnabled', val)}
                            value={settings.aiDescriptionEnabled}
                        />
                    </View>

                    {/* Paywall notice */}
                    {!settings.aiDescriptionEnabled && (
                        <View style={styles.paywallNotice}>
                            <Text style={styles.paywallTitle}>🌟 Unlock AI-Powered Listings</Text>
                            <Text style={styles.paywallText}>
                                Enable this feature to let our AI write rich, engaging product descriptions in seconds — no writing experience needed. Sellers using AI descriptions see up to 2× more clicks.
                            </Text>
                            <View style={styles.paywallFeatures}>
                                {[
                                    'Save time writing descriptions',
                                    'SEO-optimized copy',
                                    'Tone tailored to handmade products',
                                    'Works with your category & variants',
                                ].map((feature) => (
                                    <View key={feature} style={styles.paywallFeatureRow}>
                                        <Text style={styles.paywallCheck}>✓</Text>
                                        <Text style={styles.paywallFeatureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                            <Pressable
                                style={styles.paywallCta}
                                onPress={() => updateSetting('aiDescriptionEnabled', true)}
                            >
                                <Sparkles size={16} color="#fff" />
                                <Text style={styles.paywallCtaText}>Enable AI Generator</Text>
                            </Pressable>
                        </View>
                    )}

                    {settings.aiDescriptionEnabled && (
                        <View style={styles.enabledNotice}>
                            <Text style={styles.enabledNoticeText}>
                                ✓ AI Description Generator is active. You'll see the "AI Generate" button when creating or editing products.
                            </Text>
                        </View>
                    )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    content: {
        padding: 20,
        paddingBottom: 60,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 24,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingInfo: {
        flex: 1,
    },
    settingTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 20,
    },
    premiumBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    settingSubtitle: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        lineHeight: 16,
    },
    paywallNotice: {
        margin: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary + '30',
    },
    paywallTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.primary,
        marginBottom: 6,
        fontFamily: 'Quicksand',
    },
    paywallText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 19,
        marginBottom: 12,
    },
    paywallFeatures: {
        gap: 6,
        marginBottom: 16,
    },
    paywallFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paywallCheck: {
        color: theme.colors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    paywallFeatureText: {
        fontSize: 13,
        color: theme.colors.text,
    },
    paywallCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
    },
    paywallCtaText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        fontFamily: 'Quicksand',
    },
    enabledNotice: {
        margin: 16,
        backgroundColor: '#E8F5E9',
        borderRadius: 10,
        padding: 12,
    },
    enabledNoticeText: {
        fontSize: 13,
        color: '#2E7D32',
        fontWeight: '500',
    },
});
