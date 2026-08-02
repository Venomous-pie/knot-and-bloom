import React, { useEffect, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
    useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
    ChevronLeft, Sparkles, Lock, CreditCard, ChevronRight, Store,
    Truck, FileText, Bell, ShieldCheck, Coffee 
} from 'lucide-react-native';

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
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    
    const [vacationMode, setVacationMode] = useState(false);

    // Auth guard: only ACTIVE sellers or admins can access
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            const isAuthorized = user.role === 'ADMIN' || (user.sellerProfile?.uid && user.sellerProfile?.status === 'ACTIVE');
            if (!isAuthorized) {
                router.replace('/' as any);
            }
        }
    }, [user, authLoading]);

    const settingTiles = [
        {
            id: 'profile',
            title: 'Store Details',
            subtitle: 'Manage shop name, bio, avatar, and banner.',
            icon: <Store size={22} color={P} />,
            color: P_LIGHT,
            route: '/seller-dashboard/store-details'
        },
        {
            id: 'payout',
            title: 'Payout Methods',
            subtitle: 'Manage GCash and bank accounts for withdrawals.',
            icon: <CreditCard size={22} color={'#0284C7'} />,
            color: '#E0F2FE',
            route: '/seller-dashboard/payouts'
        },
        {
            id: 'shipping',
            title: 'Shipping & Fulfillment',
            subtitle: 'Set up delivery zones, rates, and pickup options.',
            icon: <Truck size={22} color={GREEN} />,
            color: GREEN + '20',
            route: '/seller-dashboard/shipping'
        },
        {
            id: 'policies',
            title: 'Store Policies',
            subtitle: 'Update return, refund, and exchange policies.',
            icon: <FileText size={22} color={INDIGO} />,
            color: INDIGO + '20',
            route: '/seller-dashboard/policies'
        },
        {
            id: 'notifications',
            title: 'Notifications',
            subtitle: 'Manage alerts for new orders and messages.',
            icon: <Bell size={22} color={AMBER} />,
            color: AMBER + '20',
            route: '/seller-dashboard/notifications'
        },
        {
            id: 'legal',
            title: 'Tax & Legal',
            subtitle: 'Business registration details and tax identifiers.',
            icon: <ShieldCheck size={22} color={TEAL} />,
            color: TEAL + '20',
            route: '/seller-dashboard/legal'
        }
    ];

    const getTileWidth = () => {
        if (isDesktop) return '31.33%';
        if (isTablet) return '48%';
        return '100%';
    };

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

            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Quick Actions & Features Section */}
                <Text style={styles.sectionLabel}>Quick Actions & Features</Text>
                <View style={styles.featuredCard}>
                    
                    {/* Vacation Mode Toggle */}
                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Coffee size={20} color={AMBER} />
                        </View>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Vacation Mode</Text>
                            <Text style={styles.settingSubtitle}>
                                Temporarily hide your shop from the marketplace when you are away.
                            </Text>
                        </View>
                        <Switch
                            trackColor={{ false: BORDER, true: AMBER }}
                            thumbColor="#fff"
                            onValueChange={setVacationMode}
                            value={vacationMode}
                        />
                    </View>
                </View>

                {/* Settings Grid */}
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Store Management</Text>
                <View style={styles.gridContainer}>
                    {settingTiles.map(tile => (
                        <View key={tile.id} style={{ width: getTileWidth(), marginBottom: 20 }}>
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.tile, 
                                    pressed && { opacity: 0.7 }
                                ]}
                                onPress={() => {
                                    if (tile.route !== '#') router.push(tile.route as any);
                                }}
                            >
                                <View style={[styles.tileIconContainer, { backgroundColor: tile.color }]}>
                                    {tile.icon}
                                </View>
                                <Text style={styles.tileTitle}>{tile.title}</Text>
                                <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
                                <View style={styles.tileArrow}>
                                    <ChevronRight size={16} color={SUB} />
                                </View>
                            </Pressable>
                        </View>
                    ))}
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
        padding: 24,
        paddingBottom: 60,
        maxWidth: 1280,
        alignSelf: 'center',
        width: '100%',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: SUB,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 16,
        marginLeft: 4,
        fontFamily: 'Quicksand',
    },
    featuredCard: {
        backgroundColor: CARD,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: BORDER,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    settingIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        marginBottom: 4,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '700',
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
        fontFamily: 'Quicksand',
    },
    settingSubtitle: {
        fontSize: 13,
        color: SUB,
        lineHeight: 18,
        fontFamily: 'Quicksand',
    },
    paywallNotice: {
        margin: 24,
        marginTop: 0,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: P_LIGHT,
        backgroundColor: '#FAFAFA',
    },
    paywallTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: P,
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    paywallText: {
        fontSize: 13,
        color: SUB,
        lineHeight: 20,
        marginBottom: 16,
        fontFamily: 'Quicksand',
    },
    paywallFeatures: {
        gap: 8,
        marginBottom: 20,
    },
    paywallFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    paywallCheck: {
        color: P,
        fontWeight: '700',
        fontSize: 14,
    },
    paywallFeatureText: {
        fontSize: 13,
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    paywallCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: P,
        paddingVertical: 14,
        borderRadius: 12,
    },
    paywallCtaText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        fontFamily: 'Quicksand',
    },
    enabledNotice: {
        margin: 24,
        marginTop: 0,
        backgroundColor: GREEN + '15',
        borderRadius: 12,
        padding: 16,
    },
    enabledNoticeText: {
        fontSize: 13,
        color: GREEN,
        fontWeight: '700',
        fontFamily: 'Quicksand',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    tile: {
        backgroundColor: CARD,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: BORDER,
        height: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
    },
    tileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    tileTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
        marginBottom: 8,
    },
    tileSubtitle: {
        fontSize: 13,
        color: SUB,
        lineHeight: 18,
        fontFamily: 'Quicksand',
        paddingRight: 12,
    },
    tileArrow: {
        position: 'absolute',
        top: 24,
        right: 20,
    }
});
