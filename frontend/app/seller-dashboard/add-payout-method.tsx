import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Save, Info, ChevronLeft, Lock, Landmark } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { paymentMethodAPI, PaymentMethodInput } from '@/services/api';
import { toastEvents } from '@/utils/toastEvents';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

export default function AddPayoutMethodPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const [saving, setSaving] = useState(false);
    
    // Form state
    const [type, setType] = useState<'GCASH' | 'PAYMAYA' | 'MARIBANK' | 'BANK'>('GCASH');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/' as any);
            return;
        }
    }, [user, authLoading]);

    const addMutation = useMutation({
        mutationFn: (data: PaymentMethodInput) => paymentMethodAPI.createPaymentMethod(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
            toastEvents.emit({ message: 'Payout method added successfully', type: 'SUCCESS' });
            router.back();
        },
        onError: (error: any) => {
            console.error('Failed to add method', error);
            const msg = error.response?.data?.error || 'Failed to add payout method';
            toastEvents.emit({ message: msg, type: 'ERROR' });
        },
        onSettled: () => setSaving(false),
    });

    const handleAdd = () => {
        if (!accountName || !accountNumber || (type === 'BANK' && !bankName)) {
            toastEvents.emit({ message: 'Please fill all fields', type: 'ERROR' });
            return;
        }
        setSaving(true);
        
        let apiType: 'GCASH' | 'PAYMAYA' | 'BANK' = 'BANK';
        let apiBankName = bankName;
        
        if (type === 'GCASH') {
            apiType = 'GCASH';
        } else if (type === 'PAYMAYA') {
            apiType = 'PAYMAYA';
        } else if (type === 'MARIBANK') {
            apiType = 'BANK';
            apiBankName = 'MariBank';
        } else {
            apiType = 'BANK';
        }
        
        addMutation.mutate({ type: apiType, accountName, accountNumber, bankName: apiType === 'BANK' ? apiBankName : undefined, isDefault: false });
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.card}>
                    {/* Secure Form Header */}
                    <View style={styles.formHeader}>
                        <Pressable style={styles.backBtn} onPress={() => router.back()}>
                            <ChevronLeft size={24} color={TEXT} />
                        </Pressable>
                        <View style={{ flex: 1, alignItems: 'center', paddingRight: 40 }}>
                            <View style={styles.secureBadge}>
                                <Lock size={12} color="#10B981" />
                                <Text style={styles.secureBadgeText}>SECURE CONNECTION</Text>
                            </View>
                            <Text style={styles.headerTitle}>Add Payout Method</Text>
                        </View>
                    </View>

                    <View style={styles.infoBanner}>
                        <Info size={16} color={P} style={{ marginTop: 2 }} />
                        <Text style={styles.infoBannerText}>
                            Ensure the account name matches your registered legal identity exactly to avoid any payout delays.
                        </Text>
                    </View>

                    <View style={{ paddingTop: 8 }}>
                        <Text style={styles.sectionLabel}>Select Method Type</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                            {['GCASH', 'PAYMAYA', 'MARIBANK', 'BANK'].map(t => (
                                <Pressable
                                    key={t}
                                    style={[styles.typeTab, type === t && styles.typeTabActive, { minWidth: '45%' }]}
                                    onPress={() => setType(t as any)}
                                >
                                    {t === 'GCASH' && <Image source={GCashIcon} style={{ width: 24, height: 24, resizeMode: 'contain', opacity: type === t ? 1 : 0.6 }} />}
                                    {t === 'PAYMAYA' && <Image source={MayaIcon} style={{ width: 24, height: 24, resizeMode: 'contain', opacity: type === t ? 1 : 0.6 }} />}
                                    {t === 'MARIBANK' && <Image source={MariBankIcon} style={{ width: 24, height: 24, resizeMode: 'contain', opacity: type === t ? 1 : 0.6 }} />}
                                    {t === 'BANK' && <Landmark size={24} color={type === t ? P : SUB} />}
                                    <Text style={[styles.typeTabText, type === t && styles.typeTabTextActive]}>
                                        {t === 'PAYMAYA' ? 'Maya' : t === 'MARIBANK' ? 'MariBank' : t === 'GCASH' ? 'GCash' : 'Other Bank'}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={{ borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 24 }}>
                            {type === 'BANK' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Bank Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. BDO, BPI, UnionBank"
                                        placeholderTextColor={SUB}
                                        value={bankName}
                                        onChangeText={setBankName}
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Account Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Name registered on the account"
                                    placeholderTextColor={SUB}
                                    value={accountName}
                                    onChangeText={setAccountName}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Account Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={type === 'BANK' ? "E.g. 109312345678" : "E.g. 09171234567"}
                                    placeholderTextColor={SUB}
                                    keyboardType="numeric"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                />
                            </View>
                        </View>

                        <Pressable 
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                            onPress={handleAdd}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Lock size={16} color="#fff" />
                                    <Text style={styles.saveBtnText}>Save Securely</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    scrollContent: { 
        flexGrow: 1,
        padding: 24, 
        paddingTop: 60,
        paddingBottom: 80, 
        alignItems: 'center',
        justifyContent: 'center'
    },
    card: { 
        backgroundColor: CARD, 
        borderRadius: 24, 
        padding: 32, 
        width: '100%', 
        maxWidth: 540, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.08, 
        shadowRadius: 24, 
        elevation: 10,
        borderWidth: 1, 
        borderColor: 'rgba(0,0,0,0.03)' 
    },
    formHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 32 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: BG, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    headerTitle: { 
        fontSize: 22, 
        fontWeight: '700', 
        color: TEXT, 
        fontFamily: 'Quicksand',
        marginTop: 4
    },
    secureBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: '#ECFDF5', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12 
    },
    secureBadgeText: { 
        fontSize: 10, 
        fontWeight: '700', 
        color: '#10B981', 
        fontFamily: 'Quicksand',
        letterSpacing: 0.5
    },
    infoBanner: { 
        flexDirection: 'row', 
        backgroundColor: P_LIGHT, 
        padding: 16, 
        borderRadius: 16, 
        gap: 12, 
        marginBottom: 32 
    },
    infoBannerText: { 
        flex: 1, 
        fontSize: 13, 
        color: P, 
        fontFamily: 'Quicksand', 
        lineHeight: 18, 
        fontWeight: '600' 
    },
    sectionLabel: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: TEXT, 
        marginBottom: 16, 
        fontFamily: 'Quicksand' 
    },
    typeTab: { 
        flex: 1, 
        paddingVertical: 16, 
        alignItems: 'center', 
        borderRadius: 16, 
        backgroundColor: BG, 
        borderWidth: 1, 
        borderColor: BORDER, 
        gap: 8 
    },
    typeTabActive: { 
        backgroundColor: P_LIGHT, 
        borderColor: P 
    },
    typeTabText: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: SUB, 
        fontFamily: 'Quicksand' 
    },
    typeTabTextActive: { 
        color: P, 
        fontWeight: '700' 
    },
    inputGroup: { 
        marginBottom: 20 
    },
    inputLabel: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: TEXT, 
        marginBottom: 8, 
        fontFamily: 'Quicksand' 
    },
    input: { 
        backgroundColor: '#FAFAFA', 
        borderWidth: 1, 
        borderColor: BORDER, 
        borderRadius: 12, 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        fontSize: 15, 
        color: TEXT, 
        fontFamily: 'Quicksand', 
        outlineStyle: 'none' as any 
    },
    saveBtn: { 
        backgroundColor: P, 
        paddingVertical: 16, 
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: 12,
        gap: 8,
        shadowColor: P,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    saveBtnText: { 
        color: 'white', 
        fontWeight: '700', 
        fontSize: 15, 
        fontFamily: 'Quicksand' 
    },
});
