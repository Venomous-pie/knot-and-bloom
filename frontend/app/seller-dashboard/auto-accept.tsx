import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Save, Sparkles, ChevronLeft } from 'lucide-react-native';
import SettingsSidebar from '@/components/seller/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI, apiClient } from '@/services/api';
import { toastEvents } from '@/utils/toastEvents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const P       = '#B36979';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const AMBER   = '#F59E0B';

export default function AutoAcceptSettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const [autoAcceptOrders, setAutoAcceptOrders] = useState(true);
    const [maxConcurrentOrders, setMaxConcurrentOrders] = useState('5');
    const [maxProcessingBacklog, setMaxProcessingBacklog] = useState('14');

    const queryClient = useQueryClient();

    const { data: seller, isLoading: queryLoading } = useQuery({
        queryKey: ['sellerProfile', user?.sellerProfile?.slug],
        queryFn: async () => {
            const res = await apiClient.get(`/sellers/${user?.sellerProfile?.slug}`);
            return res.data;
        },
        enabled: !!user?.sellerProfile?.slug,
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user || !user.sellerProfile?.uid) {
            router.replace('/' as any);
            return;
        }

        if (seller) {
            setAutoAcceptOrders(seller.autoAcceptOrders ?? true);
            setMaxConcurrentOrders(seller.maxConcurrentOrders?.toString() ?? '5');
            setMaxProcessingBacklog(seller.maxProcessingBacklog?.toString() ?? '14');
        } else {
            // Fallback to user context initially
            const profile = user.sellerProfile;
            setAutoAcceptOrders(profile.autoAcceptOrders ?? true);
            setMaxConcurrentOrders(profile.maxConcurrentOrders?.toString() ?? '5');
            setMaxProcessingBacklog(profile.maxProcessingBacklog?.toString() ?? '14');
        }
        setLoading(false);
    }, [user, authLoading, seller]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => sellerAPI.updateSellerProfile(user!.sellerProfile!.uid, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sellerProfile', user?.sellerProfile?.slug] });
            toastEvents.emit({ message: 'Auto-accept settings updated!', type: 'SUCCESS' });
        },
        onError: (error) => {
            console.error('Failed to update settings:', error);
            toastEvents.emit({ message: 'Failed to update settings.', type: 'ERROR' });
        },
        onSettled: () => setSaving(false),
    });

    const handleSave = () => {
        if (!user?.sellerProfile?.uid) return;
        setSaving(true);
        updateMutation.mutate({
            autoAcceptOrders,
            maxConcurrentOrders: parseInt(maxConcurrentOrders, 10),
            maxProcessingBacklog: parseInt(maxProcessingBacklog, 10)
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {!isDesktop && (
                            <Pressable onPress={() => router.push('/seller-dashboard/settings' as any)} style={styles.backBtn}>
                                <ChevronLeft size={20} color={TEXT} />
                            </Pressable>
                        )}
                        <View>
                            <Text style={styles.headerTitle}>Auto-Accept Orders</Text>
                            <Text style={styles.headerSubtitle}>Smart capacity-based order acceptance.</Text>
                        </View>
                    </View>
                    <Pressable 
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Save size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Layout */}
            <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', maxWidth: 1280, width: '100%', alignSelf: 'center' }}>
                
                {/* Sidebar */}
                {isDesktop && (
                    <View style={{ width: 280 }}>
                        <SettingsSidebar />
                    </View>
                )}

                {/* Main Content */}
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    <Text style={styles.sectionLabel}>Smart Auto-Accept</Text>
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Enable Feature</Text>
                                </View>
                                <Text style={styles.helperText}>Automatically accept orders if your backlog falls within limits.</Text>
                            </View>
                            <Switch
                                trackColor={{ false: BORDER, true: P }}
                                thumbColor="#fff"
                                onValueChange={setAutoAcceptOrders}
                                value={autoAcceptOrders}
                            />
                        </View>

                        {autoAcceptOrders && (
                            <View style={{ borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16, marginTop: 8 }}>
                                <Text style={styles.inputLabel}>Max Concurrent Orders</Text>
                                <Text style={styles.helperText}>Maximum active orders you can comfortably handle at once.</Text>
                                <TextInput
                                    style={[styles.input, focusedInput === 'maxOrders' && styles.inputFocused, { marginBottom: 16 }]}
                                    placeholder="e.g. 5"
                                    placeholderTextColor={SUB}
                                    keyboardType="numeric"
                                    value={maxConcurrentOrders}
                                    onChangeText={setMaxConcurrentOrders}
                                    onFocus={() => setFocusedInput('maxOrders')}
                                    onBlur={() => setFocusedInput(null)}
                                />

                                <Text style={styles.inputLabel}>Max Processing Backlog (Days)</Text>
                                <Text style={styles.helperText}>Order will only auto-accept if the combined processing time of current active orders and the new order doesn't exceed this limit.</Text>
                                <TextInput
                                    style={[styles.input, focusedInput === 'maxDays' && styles.inputFocused]}
                                    placeholder="e.g. 14"
                                    placeholderTextColor={SUB}
                                    keyboardType="numeric"
                                    value={maxProcessingBacklog}
                                    onChangeText={setMaxProcessingBacklog}
                                    onFocus={() => setFocusedInput('maxDays')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </View>
                        )}
                    </View>

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
    saveBtn: { backgroundColor: P, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 120 },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    content: { padding: 20, paddingBottom: 60, maxWidth: 800, alignSelf: 'center', width: '100%' },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: SUB, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4, fontFamily: 'Quicksand' },
    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    helperText: { fontSize: 12, color: SUB, marginBottom: 8, fontFamily: 'Quicksand' },
    input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: TEXT, fontFamily: 'Quicksand' },
    inputFocused: { borderColor: P, backgroundColor: '#FFF' },
});
