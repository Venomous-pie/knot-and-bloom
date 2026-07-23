import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Truck, MapPin, Store, Clock, ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { theme } from '@/constants/theme';

export default function ShippingPolicyPage() {
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF9' }}>
            <Stack.Screen options={{ title: "Shipping & Fulfillment", headerShadowVisible: false, headerStyle: { backgroundColor: '#FCFAF9' } }} />
            
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={20} color="#666" />
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Shipping & Fulfillment Guide</Text>
                    <Text style={styles.headerSubtitle}>
                        How Knot & Bloom helps our sellers deliver handmade goods directly to your door, reliably and affordably.
                    </Text>
                </View>

                <View style={[styles.contentContainer, isDesktop ? { maxWidth: 800 } : {}]}>
                    
                    {/* Intro */}
                    <Text style={styles.introText}>
                        Unlike massive e-commerce platforms that rely on central warehouses, Knot & Bloom is a true community marketplace. 
                        When you buy a handmade item, you are buying directly from a local maker. Because of this, shipping fees and fulfillment options depend entirely on the seller's location and their capabilities.
                    </Text>

                    {/* How It Works */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>How Delivery Works</Text>
                        
                        <View style={styles.featureCard}>
                            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                                <Store size={24} color="#0284C7" />
                            </View>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureTitle}>1. Independent Sellers</Text>
                                <Text style={styles.featureDesc}>
                                    Every seller manages their own inventory and shipping. If you buy from multiple sellers in one order, you will choose a fulfillment method (and pay a fee) for each seller separately.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={[styles.iconBox, { backgroundColor: '#D1FAE5' }]}>
                                <MapPin size={24} color="#059669" />
                            </View>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureTitle}>2. Location-Based Tiers</Text>
                                <Text style={styles.featureDesc}>
                                    Shipping rates are calculated based on how far the seller is from you. Buying from a seller in your own town is the cheapest. Rates step up for neighboring towns, same province, and inter-island shipments.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.featureCard}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Truck size={24} color="#D97706" />
                            </View>
                            <View style={styles.featureContent}>
                                <Text style={styles.featureTitle}>3. Self-Delivery vs. Courier</Text>
                                <Text style={styles.featureDesc}>
                                    If a seller lives nearby and has a vehicle, they may offer "Self-Delivery," meaning they bring the item to you personally! This is often cheaper and safer. For further distances, they will rely on 3rd-party logistics (like LBC or J&T).
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Rate Estimates */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Estimated Delivery Rates</Text>
                        <Text style={styles.sectionDesc}>
                            Rates are generated dynamically at checkout based on current fuel prices. Below is a rough estimate of what you might expect to pay:
                        </Text>
                        
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Distance</Text>
                                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Est. Rate</Text>
                            </View>
                            
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Same Municipality</Text>
                                <Text style={[styles.tableCell, styles.tableCellPrice, { flex: 1 }]}>~ ₱50</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Neighboring Municipality</Text>
                                <Text style={[styles.tableCell, styles.tableCellPrice, { flex: 1 }]}>~ ₱80</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Same Province</Text>
                                <Text style={[styles.tableCell, styles.tableCellPrice, { flex: 1 }]}>~ ₱150</Text>
                            </View>
                            <View style={styles.tableRow}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Same Region / Island Group</Text>
                                <Text style={[styles.tableCell, styles.tableCellPrice, { flex: 1 }]}>~ ₱200</Text>
                            </View>
                            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Inter-island (e.g. Mindanao to Luzon)</Text>
                                <Text style={[styles.tableCell, styles.tableCellPrice, { flex: 1 }]}>~ ₱350</Text>
                            </View>
                        </View>
                        <Text style={styles.tableFootnote}>* Note: If you arrange a "Pickup" with the seller, the fee is always ₱0.</Text>
                    </View>

                    {/* Protection */}
                    <View style={[styles.section, { marginBottom: 0 }]}>
                        <Text style={styles.sectionTitle}>Buyer Protection</Text>
                        <View style={styles.protectionCard}>
                            <ShieldCheck size={32} color={theme.colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.protectionTitle}>Payments are held securely</Text>
                                <Text style={styles.protectionDesc}>
                                    When you pay for an order via our platform, we hold the funds securely. The seller only receives the money (including the shipping fee) once you confirm that the item has been delivered safely and matches the description.
                                </Text>
                            </View>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        backgroundColor: '#FCFAF9',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginLeft: 10,
        marginBottom: 20,
        gap: 4,
    },
    backBtnText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Quicksand',
        fontWeight: '600',
    },
    headerTitle: {
        fontFamily: 'Lovingly',
        fontSize: 36,
        color: '#B36979',
        marginBottom: 10,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 24,
        fontFamily: 'Quicksand',
    },
    contentContainer: {
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 20,
    },
    introText: {
        fontSize: 16,
        color: '#444',
        lineHeight: 26,
        fontFamily: 'Quicksand',
        marginBottom: 40,
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    sectionDesc: {
        fontSize: 15,
        color: '#666',
        marginBottom: 20,
        fontFamily: 'Quicksand',
        lineHeight: 22,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 6,
        fontFamily: 'Quicksand',
    },
    featureDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        fontFamily: 'Quicksand',
    },
    table: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
    },
    tableCell: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#444',
        fontFamily: 'Quicksand',
    },
    tableHeaderText: {
        fontWeight: '700',
        color: '#333',
    },
    tableCellPrice: {
        fontWeight: '700',
        color: '#059669',
    },
    tableFootnote: {
        fontSize: 13,
        color: '#888',
        marginTop: 12,
        fontStyle: 'italic',
        fontFamily: 'Quicksand',
    },
    protectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FDEEF1',
        padding: 24,
        borderRadius: 16,
        gap: 20,
        marginTop: 10,
    },
    protectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#B36979',
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    protectionDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        fontFamily: 'Quicksand',
    }
});
