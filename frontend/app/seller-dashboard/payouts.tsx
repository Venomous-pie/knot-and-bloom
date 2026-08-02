import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, Plus, Star, Building, CheckCircle, Trash2, Save, Landmark } from 'lucide-react-native';
import SettingsSidebar from '@/components/seller/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { paymentMethodAPI, PaymentMethod, PaymentMethodInput } from '@/api/api';
import { toastEvents } from '@/utils/toastEvents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GCashIcon = require('@/assets/payment_methods/gcash/GCash_idOP67IR4D_1.png');
const MayaIcon = require('@/assets/payment_methods/maya/Maya_idX88ZrhHL_1.png');
const MariBankIcon = require('@/assets/payment_methods/mari_bank/MariBank_Philippines_idU8zrGSy__0.png');

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const RED     = '#EF4444';

export default function PayoutsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    
    const queryClient = useQueryClient();

    const { data: paymentMethods = [] } = useQuery({
        queryKey: ['paymentMethods'],
        queryFn: async () => {
            const res = await paymentMethodAPI.getPaymentMethods();
            return res.data.paymentMethods || [];
        },
        enabled: !!user,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: any) => paymentMethodAPI.deletePaymentMethod(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
            toastEvents.emit({ message: 'Method deleted', type: 'SUCCESS' });
        },
        onError: (error) => {
            console.error('Failed to delete method', error);
            toastEvents.emit({ message: 'Failed to delete method', type: 'ERROR' });
        }
    });

    const setDefaultMutation = useMutation({
        mutationFn: (id: any) => paymentMethodAPI.setDefaultPaymentMethod(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
            toastEvents.emit({ message: 'Default method updated', type: 'SUCCESS' });
        },
        onError: (error) => {
            console.error('Failed to set default', error);
            toastEvents.emit({ message: 'Failed to update default method', type: 'ERROR' });
        }
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/' as any);
            return;
        }
    }, [user, authLoading]);

    const handleDelete = (id: any) => {
        Alert.alert(
            "Remove Method",
            "Are you sure you want to remove this payout method?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Remove", 
                    style: "destructive",
                    onPress: () => deleteMutation.mutate(id)
                }
            ]
        );
    };

    const handleSetDefault = (id: any) => {
        setDefaultMutation.mutate(id);
    };

    // Removed full-screen loading state to prevent layout flash
    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Payout Settings</Text>
                        <Text style={styles.headerSubtitle}>Manage where you receive your earnings.</Text>
                    </View>
                    <Pressable style={styles.addBtn} onPress={() => router.push('/seller-dashboard/add-payout-method' as any)}>
                        <Plus size={16} color="#fff" />
                        <Text style={styles.addBtnText}>Add New</Text>
                    </Pressable>
                </View>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', maxWidth: 1024, alignSelf: 'center', width: '100%' }}>
                {isDesktop && (
                    <View style={{ width: 240, display: 'flex' }}>
                        <SettingsSidebar />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                            <Text style={styles.sectionLabel}>Your Accounts</Text>
                            
                            {paymentMethods.length === 0 ? (
                                <Text style={styles.emptyText}>No payout methods added yet.</Text>
                            ) : (
                                paymentMethods.map(pm => (
                                    <View key={pm.uid} style={[styles.card, { padding: 0, marginBottom: 16 }]}>
                                        <View style={styles.pmRow}>
                                            <View style={[styles.pmIcon, (pm.type === 'GCASH' || pm.type === 'PAYMAYA' || pm.bankName === 'MariBank') && { backgroundColor: 'transparent' }]}>
                                                {pm.type === 'GCASH' ? (
                                                    <Image source={GCashIcon} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                                                ) : pm.type === 'PAYMAYA' ? (
                                                    <Image source={MayaIcon} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                                                ) : pm.bankName === 'MariBank' ? (
                                                    <Image source={MariBankIcon} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
                                                ) : (
                                                    <Landmark size={20} color={P} />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Text style={styles.pmName}>{pm.accountName}</Text>
                                                    {pm.isDefault && (
                                                        <View style={styles.badge}>
                                                            <Star size={10} color="#fff" />
                                                            <Text style={styles.badgeText}>Default</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.pmDetails}>
                                                    {pm.type === 'BANK' ? `${pm.bankName} • ` : `${pm.type} • `} 
                                                    {pm.accountNumber}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                                {!pm.isDefault && (
                                                    <Pressable onPress={() => handleSetDefault(pm.uid)}>
                                                        <Text style={{ color: P, fontWeight: '600', fontSize: 13, fontFamily: 'Quicksand' }}>Set Default</Text>
                                                    </Pressable>
                                                )}
                                                <Pressable onPress={() => handleDelete(pm.uid)} style={{ padding: 4 }}>
                                                    <Trash2 size={18} color={RED} />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    headerSubtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },
    addBtn: { backgroundColor: P, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 120, gap: 8 },
    addBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    content: { padding: 20, paddingBottom: 60, maxWidth: 800, alignSelf: 'center', width: '100%' },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: SUB, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4, fontFamily: 'Quicksand' },
    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    inputLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: TEXT, fontFamily: 'Quicksand' },
    saveBtn: { backgroundColor: P, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 120 },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    typeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
    typeTabActive: { backgroundColor: P_LIGHT, borderColor: P },
    typeTabText: { fontSize: 13, fontWeight: '600', color: SUB, fontFamily: 'Quicksand' },
    typeTabTextActive: { color: P, fontWeight: '700' },
    emptyText: { fontSize: 14, color: SUB, fontStyle: 'italic', textAlign: 'center', marginTop: 24, fontFamily: 'Quicksand' },
    pmRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    pmIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: P_LIGHT, justifyContent: 'center', alignItems: 'center' },
    pmName: { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    pmDetails: { fontSize: 13, color: SUB, marginTop: 4, fontFamily: 'Quicksand' },
    badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: P, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 4 },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#fff', fontFamily: 'Quicksand' }
});
