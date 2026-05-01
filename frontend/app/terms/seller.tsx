import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SellerTermsPage() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Seller Terms & Conditions</Text>
                <View style={styles.backButton} /> {/* Spacer for centering */}
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.content}>
                    <Text style={styles.lastUpdated}>Last Updated: [Date]</Text>
                    
                    <Text style={styles.paragraph}>
                        Welcome to the Knot & Bloom Seller Platform. These Terms of Service ("Terms") govern your access to and use of our marketplace as a seller. Please read these Terms carefully before registering as a seller.
                    </Text>

                    <Text style={styles.sectionTitle}>1. Terms of Use</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] By applying to become a seller on Knot & Bloom, you agree to comply with all platform rules, guidelines, and policies. You must provide accurate information during the onboarding process.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Platform Responsibility & Operations</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] Knot & Bloom provides a marketplace connecting creators with buyers. We process payments and offer platform tools, but sellers are responsible for the fulfillment, quality, and shipping of their respective products unless otherwise stated.
                    </Text>

                    <Text style={styles.sectionTitle}>3. Product Guidelines</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] All items listed must be handmade, bespoke, or fall under approved creative categories. Counterfeit, hazardous, or mass-produced items are strictly prohibited and may result in account suspension.
                    </Text>

                    <Text style={styles.sectionTitle}>4. Fees and Payments</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] The platform charges a commission fee on successfully completed sales. Payouts are processed according to our standard payout schedule after an order reaches the "Completed" status.
                    </Text>

                    <Text style={styles.sectionTitle}>5. Liability</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] Knot & Bloom is not liable for disputes arising directly between sellers and buyers, though we offer mediation services. Sellers assume full liability for the safety and legality of the items they sell.
                    </Text>

                    <Text style={styles.sectionTitle}>6. Account Termination</Text>
                    <Text style={styles.paragraph}>
                        [Placeholder] We reserve the right to suspend or terminate seller accounts that violate these Terms, receive excessive complaints, or engage in fraudulent activities.
                    </Text>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            For detailed inquiries regarding these terms, please contact seller-support@knotandbloom.com
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    contentContainer: {
        padding: 24,
    },
    content: {
        maxWidth: 800,
        width: '100%',
        alignSelf: 'center',
    },
    lastUpdated: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 24,
        fontStyle: 'italic',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    paragraph: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        marginBottom: 16,
    },
    footer: {
        marginTop: 40,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    footerText: {
        fontSize: 14,
        color: theme.colors.textLight,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
