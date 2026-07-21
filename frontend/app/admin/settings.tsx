import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Settings } from 'lucide-react-native';

const BG = '#F4F4F8';
const CARD = '#FFFFFF';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';

export default function AdminSettings() {
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
                </View>
            </View>

            <View style={s.contentWrapper}>
                <View style={s.emptyState}>
                    <Settings size={48} color={SUB} style={{ opacity: 0.5, marginBottom: 16 }} />
                    <Text style={s.emptyText}>Platform settings are currently being developed.</Text>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    subtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },
    contentWrapper: { flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center', padding: 24, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center' },
    emptyText: { fontSize: 16, color: SUB, fontFamily: 'Quicksand' }
});
