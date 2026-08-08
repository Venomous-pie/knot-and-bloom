import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Store, Truck, CreditCard, Shield, FileText, Sparkles } from 'lucide-react-native';

const P = '#B36979';
const P_LIGHT = '#FDEEF1';
const TEXT = '#1A1A2E';
const SUB = '#6B7280';
const BORDER = '#F0F0F5';

const LINKS = [
    { label: 'Store Details', route: '/seller-dashboard/store-details', icon: Store },
    { label: 'Shipping & Fulfillment', route: '/seller-dashboard/shipping', icon: Truck },
    { label: 'Payout Methods', route: '/seller-dashboard/payouts', icon: CreditCard },
    { label: 'Store Policies', route: '/seller-dashboard/policies', icon: Shield },
    { label: 'Tax & Legal', route: '/seller-dashboard/legal', icon: FileText },
    { label: 'Auto-Accept Orders', route: '/seller-dashboard/auto-accept', icon: Sparkles },
];

export default function SettingsSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Quick Links</Text>
            {LINKS.map((link, idx) => {
                const isActive = pathname === link.route;
                return (
                    <TouchableOpacity
                        key={idx}
                        style={[styles.linkBtn, isActive && styles.linkBtnActive]}
                        onPress={() => router.replace(link.route as any)}
                    >
                        <link.icon size={18} color={isActive ? P : SUB} />
                        <Text style={[styles.linkTxt, isActive && styles.linkTxtActive]}>{link.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 24,
        paddingRight: 24,
        borderRightWidth: 1,
        borderRightColor: BORDER,
        height: '100%',
    },
    title: {
        fontSize: 12,
        fontWeight: '700',
        color: SUB,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 16,
        marginLeft: 8,
        fontFamily: 'Quicksand',
    },
    linkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    linkBtnActive: {
        backgroundColor: P_LIGHT,
    },
    linkTxt: {
        fontSize: 14,
        fontWeight: '600',
        color: SUB,
        fontFamily: 'Quicksand',
    },
    linkTxtActive: {
        color: P,
        fontWeight: '700',
    },
});
