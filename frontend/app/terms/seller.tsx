import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeartHandshake, ShieldCheck, Wallet, FileCheck2, Box, ArrowLeft } from 'lucide-react-native';

const P       = '#B36979'; // Brand primary — Dusty Pink
const P_LIGHT = '#FDEEF1'; // Primary tint (active backgrounds, selected states)
const BG      = '#F4F4F8'; // Page background
const CARD    = '#FFFFFF'; // Card surface
const TEXT    = '#1A1A2E'; // Primary text
const SUB     = '#6B7280'; // Secondary / muted text
const BORDER  = '#F0F0F5'; // Card borders, dividers

export default function SellerTermsPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    const terms = [
        {
            icon: <HeartHandshake size={24} color={P} />,
            title: "1. For the Local Crafters",
            content: "Knot & Bloom is a special marketplace made just for Filipino students, single parents, and local crafters. We give you a professional online shop to sell your handmade items without the high fees or complicated business permits that big websites require."
        },
        {
            icon: <ShieldCheck size={24} color={P} />,
            title: "2. Keeping it Handmade",
            content: "To make sure everything here is truly handmade, we require a \"Work in Progress\" photo showing you making the item. To help you start selling right away, your first 5 products are approved instantly once we verify your identity. If anyone tries to sell factory-made goods, buyers can easily report them to us."
        },
        {
            icon: <Wallet size={24} color={P} />,
            title: "3. Simple & Fair Fees",
            content: "We believe you should keep what you earn. We only deduct a tiny 2% fee from every successful sale—meaning you keep 98%. To help cover the costs of keeping the website running smoothly, buyers pay a small ₱15 service fee when they check out."
        },
        {
            icon: <Box size={24} color={P} />,
            title: "4. Cash on Delivery Protection",
            content: "Cash on Delivery is important, but we want to protect you from bogus buyers. If a buyer chooses COD, they must pay a 20% downpayment upfront. If they refuse to accept the package when it arrives, you get to keep that 20% to cover your wasted time and materials, and the buyer will be banned from using COD again."
        },
        {
            icon: <FileCheck2 size={24} color={P} />,
            title: "5. Trust and Safety",
            content: "To keep our community safe, we require all sellers to verify their identity with a valid ID before they start selling. We ask that you provide honest information. If anyone breaks these rules or tries to scam our community, their account will be permanently removed."
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Page Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                        <ArrowLeft size={20} color={TEXT} />
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Seller Terms & Conditions</Text>
                    <View style={{ width: 80 }} /> {/* Spacer for flex balance */}
                </View>
            </View>

            {/* Scrollable Content */}
            <View style={{ flex: 1, maxWidth: 800, width: '100%', alignSelf: 'center' }}>
                <ScrollView 
                    contentContainerStyle={{ padding: 24, paddingBottom: 52 }}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.lastUpdated}>Last Updated: July 2026</Text>
                    
                    <Text style={styles.introText}>
                        Welcome to the Knot & Bloom Seller Platform. These Terms of Service ("Terms") govern your access to and use of our marketplace. Please read these Terms carefully. By registering as a seller, you agree to these guidelines designed to protect our community of Filipino micro-creators.
                    </Text>

                    {terms.map((term, index) => (
                        <View key={index} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconContainer}>
                                    {term.icon}
                                </View>
                                <Text style={styles.cardTitle}>{term.title}</Text>
                            </View>
                            <Text style={styles.cardContent}>{term.content}</Text>
                        </View>
                    ))}

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            For detailed inquiries regarding these terms, please contact knotandbloom.shop@gmail.com
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
    },
    headerContainer: {
        backgroundColor: CARD,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        paddingHorizontal: 24,
        paddingVertical: 16,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: BG,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    backBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: TEXT,
        fontFamily: 'Quicksand',
    },
    lastUpdated: {
        fontSize: 14,
        color: SUB,
        fontFamily: 'Quicksand',
        fontStyle: 'italic',
        marginBottom: 16,
        textAlign: 'center',
    },
    introText: {
        fontSize: 15,
        color: TEXT,
        fontFamily: 'Quicksand',
        lineHeight: 24,
        marginBottom: 32,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: CARD,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: BORDER,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: P_LIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: TEXT,
        fontFamily: 'Quicksand',
        flex: 1,
    },
    cardContent: {
        fontSize: 15,
        color: SUB,
        fontFamily: 'Quicksand',
        lineHeight: 24,
    },
    footer: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: BORDER,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        color: SUB,
        fontFamily: 'Quicksand',
        fontStyle: 'italic',
        textAlign: 'center',
    }
});
