import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Settings, Save, AlertTriangle, Truck } from 'lucide-react-native';
import { adminAPI } from "@/api/api";

const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#E5E7EB';
const P = '#B36979';

type ConfigKey = 
    | 'fuelPricePerLiter'
    | 'motorcycleFuelEfficiency'
    | 'tricycleFuelEfficiency'
    | 'multicabFuelEfficiency'
    | 'laborAllowance'
    | 'floorFee'
    | 'selfDeliveryMaxKm';

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<Record<ConfigKey, string>>({
        fuelPricePerLiter: '80',
        motorcycleFuelEfficiency: '40',
        tricycleFuelEfficiency: '25',
        multicabFuelEfficiency: '15',
        laborAllowance: '25',
        floorFee: '30',
        selfDeliveryMaxKm: '25'
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await adminAPI.getPlatformConfig();
            if (res.config) {
                setConfig(prev => ({ ...prev, ...res.config }));
            }
        } catch (error) {
            console.error('Failed to fetch platform config', error);
            Alert.alert('Error', 'Failed to load platform settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            
            // Convert strings to numbers for saving
            const updates: Record<string, number> = {};
            for (const [k, v] of Object.entries(config)) {
                updates[k] = Number(v) || 0;
            }

            await adminAPI.updatePlatformConfig(updates);
            Alert.alert('Success', 'Platform settings updated successfully.');
        } catch (error) {
            console.error('Failed to update platform config', error);
            Alert.alert('Error', 'Failed to update platform settings.');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key: ConfigKey, value: string) => {
        // Only allow numbers and optional decimal point
        const sanitized = value.replace(/[^0-9.]/g, '');
        setConfig(prev => ({ ...prev, [key]: sanitized }));
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Admin Settings" }} />
            
            {/* Header Bar */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Platform Settings</Text>
                        <Text style={s.subtitle}>Manage global platform configurations</Text>
                    </View>
                    <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving || loading}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                            <>
                                <Save size={18} color="#fff" />
                                <Text style={s.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={P} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={s.contentWrapper}>
                    <View style={s.section}>
                        <View style={s.sectionHeader}>
                            <Truck size={20} color={TEXT} />
                            <Text style={s.sectionTitle}>Self-Delivery Calculation Variables</Text>
                        </View>
                        <Text style={s.sectionDesc}>
                            These variables are used to calculate the real-time delivery fee when a buyer checks out with a seller who offers self-delivery.
                        </Text>
                        
                        <View style={s.card}>
                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Fuel Price per Liter (₱)</Text>
                                    <Text style={s.inputSub}>Current local pump price for regular gasoline.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.fuelPricePerLiter}
                                    onChangeText={(v) => updateField('fuelPricePerLiter', v)}
                                />
                            </View>
                            <View style={s.divider} />
                            
                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Motorcycle Fuel Efficiency (km/L)</Text>
                                    <Text style={s.inputSub}>Average km per liter for a standard motorcycle.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.motorcycleFuelEfficiency}
                                    onChangeText={(v) => updateField('motorcycleFuelEfficiency', v)}
                                />
                            </View>
                            <View style={s.divider} />

                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Tricycle Fuel Efficiency (km/L)</Text>
                                    <Text style={s.inputSub}>Average km per liter for a tricycle.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.tricycleFuelEfficiency}
                                    onChangeText={(v) => updateField('tricycleFuelEfficiency', v)}
                                />
                            </View>
                            <View style={s.divider} />

                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Multicab Fuel Efficiency (km/L)</Text>
                                    <Text style={s.inputSub}>Average km per liter for a multicab/van.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.multicabFuelEfficiency}
                                    onChangeText={(v) => updateField('multicabFuelEfficiency', v)}
                                />
                            </View>
                            <View style={s.divider} />

                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Labor Allowance (₱)</Text>
                                    <Text style={s.inputSub}>Flat base pay added to the fuel cost to compensate the seller's time.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.laborAllowance}
                                    onChangeText={(v) => updateField('laborAllowance', v)}
                                />
                            </View>
                            <View style={s.divider} />

                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Minimum Floor Fee (₱)</Text>
                                    <Text style={s.inputSub}>The lowest possible delivery fee, regardless of how close the buyer is.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.floorFee}
                                    onChangeText={(v) => updateField('floorFee', v)}
                                />
                            </View>
                            <View style={s.divider} />

                            <View style={s.inputRow}>
                                <View style={s.inputInfo}>
                                    <Text style={s.inputLabel}>Max Self-Delivery Radius (km)</Text>
                                    <Text style={s.inputSub}>Calculated trips exceeding this distance will fall back to third-party flat rates.</Text>
                                </View>
                                <TextInput
                                    style={s.input}
                                    keyboardType="numeric"
                                    value={config.selfDeliveryMaxKm}
                                    onChangeText={(v) => updateField('selfDeliveryMaxKm', v)}
                                />
                            </View>
                        </View>

                        <View style={s.warningBanner}>
                            <AlertTriangle size={16} color="#D97706" style={{ marginTop: 2 }} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={s.warningText}>
                                    Changes to these settings take effect immediately on new checkouts. Existing orders and finalized carts are not affected.
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    subtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', fontFamily: 'Quicksand' },
    
    contentWrapper: { maxWidth: 1024, width: '100%', alignSelf: 'center', padding: 24 },
    
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    sectionDesc: { fontSize: 14, color: SUB, fontFamily: 'Quicksand', marginBottom: 16, lineHeight: 20 },
    
    card: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    inputInfo: { flex: 1, paddingRight: 24 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    inputSub: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', lineHeight: 18 },
    input: { width: 100, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontFamily: 'Quicksand', textAlign: 'right', fontWeight: '600' },
    divider: { height: 1, backgroundColor: BORDER },
    
    warningBanner: { flexDirection: 'row', backgroundColor: '#FEF3C7', padding: 16, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
    warningText: { fontSize: 13, color: '#92400E', fontFamily: 'Quicksand', lineHeight: 18 }
});
