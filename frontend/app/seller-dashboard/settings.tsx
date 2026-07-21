import React, { useEffect } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, Lock, CreditCard, ChevronRight, Store } from 'lucide-react-native';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';
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
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Seller Settings</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Manage your shop profile, preferences, and account settings.</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                <ScrollView contentContainerStyle={styles.content}>

                {/* Shop Profile Section */}
                <Text style={styles.sectionLabel}>Shop Profile</Text>
                <View style={styles.card}>
                    <Pressable
                        style={styles.linkRow}
                        onPress={() => router.push('/profile' as any)}
                    >
                        <View style={[styles.settingIcon, { backgroundColor: P_LIGHT }]}>
                            <Store size={20} color={P} />
                        </View>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Edit Shop Profile</Text>
                            <Text style={styles.settingSubtitle}>
                                Update your shop name, bio, avatar, and banner image.
                            </Text>
                        </View>
                        <ChevronRight size={18} color={SUB} />
                    </Pressable>

                    <Pressable
                        style={[styles.linkRow, { borderBottomWidth: 0 }]}
                        onPress={() => router.push('/profile/payment-methods' as any)}
                    >
                        <View style={[styles.settingIcon, { backgroundColor: '#E0F2FE' }]}>
                            <CreditCard size={20} color={'#0284C7'} />
                        </View>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Payout Methods</Text>
                            <Text style={styles.settingSubtitle}>
                                Manage your GCash, PayMaya, and bank accounts for withdrawals.
                            </Text>
                        </View>
                        <ChevronRight size={18} color={SUB} />
                    </Pressable>
                </View>

                {/* AI Features Section */}
                <Text style={styles.sectionLabel}>AI Features</Text>
                <View style={styles.card}>
                    {/* AI Description Toggle */}
                    <View style={styles.settingRow}>
                        <View style={styles.settingIcon}>
                            <Sparkles size={20} color={P} />
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
                            trackColor={{ false: BORDER, true: P }}
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: TEXT,
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
        color: SUB,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        backgroundColor: CARD,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: BORDER,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: P_LIGHT,
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
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: P,
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
        color: SUB,
        lineHeight: 16,
    },
    paywallNotice: {
        margin: 20,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: P_LIGHT,
        backgroundColor: CARD,
    },
    paywallTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: P,
        marginBottom: 6,
        fontFamily: 'Quicksand',
    },
    paywallText: {
        fontSize: 13,
        color: SUB,
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
        color: P,
        fontWeight: '700',
        fontSize: 14,
    },
    paywallFeatureText: {
        fontSize: 13,
        color: TEXT,
    },
    paywallCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: P,
        paddingVertical: 12,
        borderRadius: 12,
    },
    paywallCtaText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        fontFamily: 'Quicksand',
    },
    enabledNotice: {
        margin: 20,
        backgroundColor: GREEN + '20',
        borderRadius: 12,
        padding: 12,
    },
    enabledNoticeText: {
        fontSize: 13,
        color: GREEN,
        fontWeight: '600',
    },
});
