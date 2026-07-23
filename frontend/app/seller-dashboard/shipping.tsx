import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
    Animated,
    AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Truck, MapPin, Bike, Car, Box, Info } from 'lucide-react-native';

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

import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI, apiClient } from '@/api/api';
import { toastEvents } from '@/utils/toastEvents';

type VehicleType = 'NONE' | 'MOTORCYCLE' | 'TRICYCLE' | 'MULTICAB';

interface RatePreview {
    tier: number;
    label: string;
    fee: number;
    resolvedType: 'SELF_DELIVERY' | 'THIRD_PARTY' | 'PICKUP';
}

export default function SellerShippingSettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [expandedRate, setExpandedRate] = useState<number | null>(null);

    const [selfDeliveryEnabled, setSelfDeliveryEnabled] = useState(false);
    const [freeShippingEnabled, setFreeShippingEnabled] = useState(false);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
    const [vehicleType, setVehicleType] = useState<VehicleType>('NONE');
    const [meetUpPoint, setMeetUpPoint] = useState('');
    const [sellerCitymunCode, setSellerCitymunCode] = useState('');
    const [ratePreview, setRatePreview] = useState<RatePreview[]>([]);

    const initialSettings = useRef({
        selfDeliveryEnabled: false,
        freeShippingEnabled: false,
        freeShippingThreshold: '',
        vehicleType: 'NONE' as any,
        meetUpPoint: '',
    });

    const hasUnsavedChanges = !loading && (
        selfDeliveryEnabled !== initialSettings.current.selfDeliveryEnabled ||
        freeShippingEnabled !== initialSettings.current.freeShippingEnabled ||
        freeShippingThreshold !== initialSettings.current.freeShippingThreshold ||
        vehicleType !== initialSettings.current.vehicleType ||
        meetUpPoint !== initialSettings.current.meetUpPoint
    );

    const stateRef = useRef({
        selfDeliveryEnabled, freeShippingEnabled, freeShippingThreshold, vehicleType, meetUpPoint, sellerCitymunCode, hasUnsavedChanges
    });
    useEffect(() => {
        stateRef.current = { selfDeliveryEnabled, freeShippingEnabled, freeShippingThreshold, vehicleType, meetUpPoint, sellerCitymunCode, hasUnsavedChanges };
    }, [selfDeliveryEnabled, freeShippingEnabled, freeShippingThreshold, vehicleType, meetUpPoint, sellerCitymunCode, hasUnsavedChanges]);

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                const s = stateRef.current;
                if (s.hasUnsavedChanges) {
                    sellerAPI.updateShippingSettings({
                        selfDeliveryEnabled: s.selfDeliveryEnabled,
                        freeShippingEnabled: s.freeShippingEnabled,
                        freeShippingThreshold: s.freeShippingThreshold ? Number(s.freeShippingThreshold) : null,
                        vehicleType: s.vehicleType,
                        meetUpPoint: s.meetUpPoint,
                        sellerCitymunCode: s.sellerCitymunCode,
                    }).then(() => {
                        toastEvents.emit({ message: 'Unsaved changes auto-saved.', type: 'SUCCESS' });
                    }).catch(console.error);
                }
            };
        }, [])
    );

    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (hasUnsavedChanges) {
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true })
                ])
            );
            anim.start();
        } else {
            pulseAnim.setValue(1);
        }
        return () => anim?.stop();
    }, [hasUnsavedChanges]);

    
    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.replace('/auth/login' as any);
                return;
            }
            if (user.role !== 'ADMIN' && !(user.sellerId && user.sellerStatus === 'ACTIVE')) {
                router.replace('/' as any);
                return;
            }
            fetchSettings();
            fetchPreview();
        }
    }, [user, authLoading]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            if (user?.sellerSlug) {
                // Fetch public profile which contains the settings
                const res = await apiClient.get(`/sellers/${user.sellerSlug}`);
                const seller = res.data;
                setSelfDeliveryEnabled(seller.selfDeliveryEnabled || false);
                setFreeShippingEnabled(seller.freeShippingEnabled || false);
                setFreeShippingThreshold(seller.freeShippingThreshold ? seller.freeShippingThreshold.toString() : '');
                setVehicleType(seller.vehicleType || 'NONE');
                setMeetUpPoint(seller.meetUpPoint || '');
                setSellerCitymunCode(seller.sellerCitymunCode || '');

                initialSettings.current = {
                    selfDeliveryEnabled: seller.selfDeliveryEnabled || false,
                    freeShippingEnabled: seller.freeShippingEnabled || false,
                    freeShippingThreshold: seller.freeShippingThreshold ? seller.freeShippingThreshold.toString() : '',
                    vehicleType: seller.vehicleType || 'NONE',
                    meetUpPoint: seller.meetUpPoint || '',
                };
                setSellerCitymunCode(seller.sellerCitymunCode || '');
            }
        } catch (error) {
            console.error('Failed to fetch seller profile', error);
            Alert.alert('Error', 'Failed to load shipping settings.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPreview = async () => {
        try {
            setPreviewLoading(true);
            const res = await sellerAPI.getShippingPreview();
            if ((res.data as any)?.rates) {
                setRatePreview((res.data as any).rates);
            }
        } catch (error) {
            console.error('Failed to fetch shipping preview', error);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSave = async () => {
        if (freeShippingEnabled && (!freeShippingThreshold || Number(freeShippingThreshold) <= 0)) {
            Alert.alert('Validation Error', 'Please enter a valid minimum order amount to offer free shipping.');
            return;
        }

        try {
            setSaving(true);
            await sellerAPI.updateShippingSettings({
                selfDeliveryEnabled,
                freeShippingEnabled,
                freeShippingThreshold: freeShippingThreshold ? Number(freeShippingThreshold) : null,
                vehicleType,
                meetUpPoint,
                sellerCitymunCode,
            });

            initialSettings.current = {
                selfDeliveryEnabled,
                freeShippingEnabled,
                freeShippingThreshold,
                vehicleType,
                meetUpPoint,
            };

            fetchPreview();
            toastEvents.emit({ message: 'Shipping settings updated.', type: 'SUCCESS' });
        } catch (error: any) {
            console.error('Failed to update shipping settings', error);
            const errorMessage = error.response?.data?.error || 'Failed to update shipping settings.';
            Alert.alert('Error', errorMessage);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Shipping & Fulfillment</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>Manage how you deliver your handmade goods to buyers.</Text>
                    </View>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving || loading}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                        </Pressable>
                    </Animated.View>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {loading ? (
                        <View style={{ flex: 1 }}>
                            {/* Local Delivery Skeleton */}
                            <Animated.View style={{ opacity: pulseAnim, width: 140, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 12, marginLeft: 4 }} />
                            <Animated.View style={{ opacity: pulseAnim, height: 220, backgroundColor: '#E2E8F0', borderRadius: 24, marginBottom: 24 }} />

                            {/* Free Shipping Skeleton */}
                            <Animated.View style={{ opacity: pulseAnim, width: 160, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 12, marginLeft: 4 }} />
                            <Animated.View style={{ opacity: pulseAnim, height: 88, backgroundColor: '#E2E8F0', borderRadius: 24, marginBottom: 24 }} />

                            {/* Buyer Pickup Skeleton */}
                            <Animated.View style={{ opacity: pulseAnim, width: 120, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 12, marginLeft: 4 }} />
                            <Animated.View style={{ opacity: pulseAnim, height: 88, backgroundColor: '#E2E8F0', borderRadius: 24, marginBottom: 24 }} />

                            {/* Rate Preview Skeleton */}
                            <Animated.View style={{ opacity: pulseAnim, width: 150, height: 16, backgroundColor: '#E2E8F0', borderRadius: 4, marginBottom: 12, marginLeft: 4 }} />
                            <Animated.View style={{ opacity: pulseAnim, height: 140, backgroundColor: '#E2E8F0', borderRadius: 24, marginBottom: 24 }} />
                        </View>
                    ) : (
                        <>
                            {/* Self-Delivery Configuration */}
                            <Text style={styles.sectionLabel}>Local Delivery Setup</Text>
                    
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={[styles.settingIcon, { backgroundColor: P_LIGHT }]}>
                                <Truck size={20} color={P} />
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingTitle}>Offer Self-Delivery</Text>
                                <Text style={styles.settingSubtitle}>
                                    Enable this if you have a vehicle and can deliver orders yourself to buyers in your area. You will keep the delivery fee.
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: BORDER, true: P }}
                                thumbColor="#fff"
                                onValueChange={setSelfDeliveryEnabled}
                                value={selfDeliveryEnabled}
                            />
                        </View>

                        {selfDeliveryEnabled && (
                            <View style={styles.expandedSection}>
                                <Text style={styles.inputLabel}>What type of vehicle do you use?</Text>
                                <Text style={styles.helperText}>This determines your base delivery fee and capacity.</Text>
                                
                                <View style={styles.vehicleGrid}>
                                    {(['NONE', 'MOTORCYCLE', 'TRICYCLE', 'MULTICAB'] as VehicleType[]).map((type) => {
                                        const isSelected = vehicleType === type;
                                        return (
                                            <Pressable
                                                key={type}
                                                style={[styles.vehicleCard, isSelected && styles.vehicleCardActive]}
                                                onPress={() => setVehicleType(type)}
                                            >
                                                {type === 'MOTORCYCLE' && <Bike size={24} color={isSelected ? P : SUB} />}
                                                {type === 'TRICYCLE' && <Box size={24} color={isSelected ? P : SUB} />}
                                                {type === 'MULTICAB' && <Car size={24} color={isSelected ? P : SUB} />}
                                                {type === 'NONE' && <Text style={{ fontSize: 24, color: isSelected ? P : SUB }}>—</Text>}
                                                <Text style={[styles.vehicleText, isSelected && styles.vehicleTextActive]}>
                                                    {type.charAt(0) + type.slice(1).toLowerCase()}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                                
                                {vehicleType === 'NONE' && (
                                    <View style={styles.infoBanner}>
                                        <Info size={16} color={AMBER} style={{ marginTop: 2 }} />
                                        <Text style={styles.infoBannerText}>
                                            Selecting 'None' means you will rely on third-party couriers (like hired habal-habal) for deliveries. You will not earn the delivery fee yourself.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Free Shipping Promo */}
                    <Text style={styles.sectionLabel}>Free Shipping Promo</Text>
                    
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={[styles.settingIcon, { backgroundColor: '#FCE7F3' }]}>
                                <Text style={{ fontSize: 20 }}>🎁</Text>
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingTitle}>Offer Free Shipping</Text>
                                <Text style={styles.settingSubtitle}>
                                    Waive the shipping fee for buyers who spend a certain amount at your shop.
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: BORDER, true: P }}
                                thumbColor="#fff"
                                onValueChange={setFreeShippingEnabled}
                                value={freeShippingEnabled}
                            />
                        </View>

                        {freeShippingEnabled && (
                            <View style={styles.expandedSection}>
                                <View style={styles.infoBanner}>
                                    <Info size={16} color={AMBER} style={{ marginTop: 2 }} />
                                    <Text style={styles.infoBannerText}>
                                        ⚠️ Warning: Offering free shipping means you will absorb the delivery cost yourself. This can vary wildly from ₱30 for local deliveries to over ₱350 for inter-island shipping.
                                    </Text>
                                </View>

                                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Minimum Order Amount (₱)</Text>
                                <Text style={styles.helperText}>Buyers must spend this much in your shop to qualify.</Text>
                                <TextInput
                                    style={[styles.input, focusedInput === 'threshold' && styles.inputFocused]}
                                    placeholder="E.g., 500"
                                    placeholderTextColor={SUB}
                                    keyboardType="numeric"
                                    value={freeShippingThreshold}
                                    onChangeText={setFreeShippingThreshold}
                                    onFocus={() => setFocusedInput('threshold')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </View>
                        )}
                    </View>

                    {/* Pickup Setup */}
                    <Text style={styles.sectionLabel}>Buyer Pickup</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={[styles.settingIcon, { backgroundColor: '#E0F2FE' }]}>
                                <MapPin size={20} color="#0284C7" />
                            </View>
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingTitle}>Meetup Point (Optional)</Text>
                                <Text style={styles.settingSubtitle}>
                                    Specify a default meetup location (e.g., "Town Plaza" or "In front of Municipal Hall") if you allow buyers to pick up their orders for free.
                                </Text>
                            </View>
                        </View>
                        
                        <View style={{ marginTop: 16 }}>
                            <TextInput
                                style={[styles.input, focusedInput === 'meetup' && styles.inputFocused]}
                                placeholder="E.g., Madrid Town Plaza near Municipal Hall"
                                placeholderTextColor={SUB}
                                value={meetUpPoint}
                                onChangeText={setMeetUpPoint}
                                onFocus={() => setFocusedInput('meetup')}
                                onBlur={() => setFocusedInput(null)}
                            />
                        </View>
                    </View>

                    {/* Rate Preview */}
                    <Text style={styles.sectionLabel}>Your Rate Preview</Text>
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' }}>What buyers will pay</Text>
                                <Text style={{ fontSize: 12, color: SUB, fontFamily: 'Quicksand', marginTop: 2 }}>Based on your current settings. Save to refresh.</Text>
                            </View>
                            {previewLoading && <ActivityIndicator size="small" color={P} />}
                        </View>

                        {ratePreview.length === 0 && !previewLoading ? (
                            <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }}>
                                Save your settings to see your rate preview.
                            </Text>
                        ) : (
                            ratePreview.map((rate, idx) => {
                                const isLast = idx === ratePreview.length - 1;
                                const isSelf = rate.resolvedType === 'SELF_DELIVERY';
                                const badgeColor = isSelf ? GREEN : AMBER;
                                const badgeLabel = isSelf ? 'Self-Delivery' : '3rd Party';
                                return (
                                    <View key={rate.tier} style={[
                                        { paddingVertical: 12 },
                                        !isLast && { borderBottomWidth: 1, borderBottomColor: BORDER }
                                    ]}>
                                        <Pressable 
                                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                            onPress={() => setExpandedRate(expandedRate === rate.tier ? null : rate.tier)}
                                        >
                                            <View>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' }}>{rate.label}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                    <View style={{ backgroundColor: badgeColor + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor, fontFamily: 'Quicksand' }}>{badgeLabel}</Text>
                                                    </View>
                                                    {(rate as any).breakdown && (
                                                        <Info size={14} color={SUB} />
                                                    )}
                                                </View>
                                            </View>
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand' }}>
                                                {rate.fee === 0 ? 'Free' : `₱${rate.fee}`}
                                            </Text>
                                        </Pressable>
                                        
                                        {expandedRate === rate.tier && (rate as any).breakdown && (
                                            <View style={{ marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: BORDER }}>
                                                <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT, marginBottom: 8 }}>Fee Calculation Breakdown:</Text>
                                                {(rate as any).breakdown.map((line: string, i: number) => (
                                                    <Text key={i} style={{ fontSize: 12, color: SUB, fontFamily: 'Quicksand', marginBottom: 4 }}>• {line}</Text>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </>
            )}
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
    headerSubtitle: {
        fontSize: 13,
        color: SUB,
        fontFamily: 'Quicksand',
        marginTop: 4,
    },
    saveBtn: {
        backgroundColor: P,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
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
        fontFamily: 'Quicksand',
    },
    card: {
        backgroundColor: CARD,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    settingIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingInfo: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    settingSubtitle: {
        fontSize: 13,
        color: SUB,
        fontFamily: 'Quicksand',
        marginTop: 4,
        lineHeight: 18,
    },
    expandedSection: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    helperText: {
        fontSize: 12,
        color: SUB,
        fontFamily: 'Quicksand',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        fontFamily: 'Quicksand',
        color: TEXT,
        backgroundColor: BG,
        ...( { outlineStyle: 'none' } as any), // Remove default web outline
    },
    inputFocused: {
        borderColor: P,
        backgroundColor: '#FFFFFF',
    },
    vehicleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    vehicleCard: {
        flex: 1,
        minWidth: '45%',
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 8,
        backgroundColor: BG,
    },
    vehicleCardActive: {
        borderColor: P,
        backgroundColor: P_LIGHT,
    },
    vehicleText: {
        fontSize: 14,
        fontWeight: '600',
        color: SUB,
        fontFamily: 'Quicksand',
    },
    vehicleTextActive: {
        color: P,
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7', // Amber light
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#D97706', // Amber dark
        fontFamily: 'Quicksand',
        lineHeight: 18,
    },
});
