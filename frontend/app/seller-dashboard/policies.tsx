import React, { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import SettingsSidebarComponent from '@/components/seller/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, Save, Info } from 'lucide-react-native';
import { toastEvents } from '@/utils/toastEvents';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';

export default function StorePoliciesPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    const [saving, setSaving] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    // Mock state for policies
    const [returnPolicy, setReturnPolicy] = useState('We accept returns within 7 days of delivery for defective items.');
    const [refundPolicy, setRefundPolicy] = useState('Refunds will be processed to the original payment method after we receive and inspect the returned item.');
    const [cancellationPolicy, setCancellationPolicy] = useState('Orders can only be cancelled before they are shipped.');

    const handleSave = async () => {
        setSaving(true);
        // Mock API call
        setTimeout(() => {
            setSaving(false);
            toastEvents.emit({ message: 'Store policies updated successfully!', type: 'SUCCESS' });
            router.back();
        }, 1000);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Store Policies</Text>
                        <Text style={styles.headerSubtitle}>Set expectations for returns, cancellations, and more.</Text>
                    </View>
                    <Pressable 
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Save size={16} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Policies</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', maxWidth: 1024, alignSelf: 'center', width: '100%' }}>
                {isDesktop && (
                    <View style={{ width: 240, display: 'flex' }}>
                        <SettingsSidebarComponent />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.infoBanner}>
                        <Info size={16} color={P} style={{ marginTop: 2 }} />
                        <Text style={styles.infoBannerText}>
                            Clearly stated policies help build trust with buyers and reduce disputes. These policies will be shown on your shop profile and checkout pages.
                        </Text>
                    </View>

                    <Text style={styles.sectionLabel}>Returns & Refunds</Text>
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Return Policy</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }, focusedInput === 'return' && styles.inputFocused]}
                            placeholder="Do you accept returns? Under what conditions?"
                            placeholderTextColor={SUB}
                            multiline
                            value={returnPolicy}
                            onChangeText={setReturnPolicy}
                            onFocus={() => setFocusedInput('return')}
                            onBlur={() => setFocusedInput(null)}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Refund Policy</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }, focusedInput === 'refund' && styles.inputFocused]}
                            placeholder="How are refunds processed for your shop?"
                            placeholderTextColor={SUB}
                            multiline
                            value={refundPolicy}
                            onChangeText={setRefundPolicy}
                            onFocus={() => setFocusedInput('refund')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>Order Modifications</Text>
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Cancellation Policy</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }, focusedInput === 'cancel' && styles.inputFocused]}
                            placeholder="Can buyers cancel their orders? Until when?"
                            placeholderTextColor={SUB}
                            multiline
                            value={cancellationPolicy}
                            onChangeText={setCancellationPolicy}
                            onFocus={() => setFocusedInput('cancel')}
                            onBlur={() => setFocusedInput(null)}
                        />
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
    input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: TEXT, fontFamily: 'Quicksand' },
    inputFocused: { borderColor: P, backgroundColor: '#FFF' },
    infoBanner: { flexDirection: 'row', backgroundColor: P_LIGHT, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12, alignItems: 'flex-start' },
    infoBannerText: { flex: 1, color: P, fontSize: 13, lineHeight: 20, fontFamily: 'Quicksand', fontWeight: '500' }
});
