import { useAuth } from '@/app/auth';
import { RelativePathString, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RewardsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/auth/login' as RelativePathString);
        }
    }, [user, authLoading]);

    if (authLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </Pressable>
                    <Text style={styles.title}>My Rewards</Text>
                    <View style={{ width: 60 }} />
                </View>

                {/* Points Card */}
                <View style={styles.pointsCard}>
                    <View style={styles.pointsIcon}>
                        <Text style={styles.pointsIconText}>⭐</Text>
                    </View>
                    <Text style={styles.pointsLabel}>Your Points</Text>
                    <Text style={styles.pointsValue}>0</Text>
                    <Text style={styles.pointsSubtext}>points available</Text>
                </View>

                {/* Coming Soon Banner */}
                <View style={styles.comingSoon}>
                    <Text style={styles.comingSoonIcon}>🚧</Text>
                    <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
                    <Text style={styles.comingSoonText}>
                        Our rewards program is still in development. Soon you'll be able to earn points
                        with every purchase and redeem them for exclusive discounts!
                    </Text>
                </View>

                {/* How It Will Work */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>How It Will Work</Text>

                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>1</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Shop & Earn</Text>
                            <Text style={styles.stepDescription}>
                                Earn 1 point for every ₱100 spent on your orders
                            </Text>
                        </View>
                    </View>

                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>2</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Collect Points</Text>
                            <Text style={styles.stepDescription}>
                                Watch your points grow with every purchase
                            </Text>
                        </View>
                    </View>

                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>3</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Redeem Rewards</Text>
                            <Text style={styles.stepDescription}>
                                Use your points for discounts on future orders
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bonus Ways to Earn */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Bonus Ways to Earn</Text>

                    <View style={styles.bonusItem}>
                        <Text style={styles.bonusIcon}>🎂</Text>
                        <View style={styles.bonusContent}>
                            <Text style={styles.bonusTitle}>Birthday Bonus</Text>
                            <Text style={styles.bonusPoints}>+50 points</Text>
                        </View>
                    </View>

                    <View style={styles.bonusItem}>
                        <Text style={styles.bonusIcon}>👥</Text>
                        <View style={styles.bonusContent}>
                            <Text style={styles.bonusTitle}>Refer a Friend</Text>
                            <Text style={styles.bonusPoints}>+100 points each</Text>
                        </View>
                    </View>

                    <View style={styles.bonusItem}>
                        <Text style={styles.bonusIcon}>⭐</Text>
                        <View style={styles.bonusContent}>
                            <Text style={styles.bonusTitle}>Write a Review</Text>
                            <Text style={styles.bonusPoints}>+10 points</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 20,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: Platform.OS === 'web' ? 'serif' : 'System',
    },
    pointsCard: {
        backgroundColor: 'linear-gradient(135deg, #C88EA7 0%, #B36979 100%)',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: "#C88EA7",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
    },
    pointsIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    pointsIconText: {
        fontSize: 28,
    },
    pointsLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    pointsValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: 'white',
    },
    pointsSubtext: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    comingSoon: {
        backgroundColor: '#FFF3E0',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FFE0B2',
        borderStyle: 'dashed',
    },
    comingSoonIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 8,
    },
    comingSoonText: {
        fontSize: 14,
        color: '#F57C00',
        textAlign: 'center',
        lineHeight: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 20,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#C88EA7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    stepNumberText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 14,
        color: '#666',
    },
    bonusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    bonusIcon: {
        fontSize: 24,
        marginRight: 16,
    },
    bonusContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bonusTitle: {
        fontSize: 15,
        color: '#333',
    },
    bonusPoints: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
});
