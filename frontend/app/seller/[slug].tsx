import ProductPage from "@/components/ProductPage";
import { Product } from "@/types/products";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";
import { ArrowLeft, MapPin, Calendar, Star, Package, TrendingUp } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SellerProfileData {
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    banner?: string;
    products: Product[];
    createdAt?: string;
    location?: string;
    totalSales?: number;
    rating?: number;
}

export default function SellerProfile() {
    const { slug } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [seller, setSeller] = useState<SellerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fetchSeller = async () => {
            try {
                // Adjust URL based on environment/config. Assuming relative /api works with proxy or absolute
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/sellers/${slug}`);
                if (!response.ok) {
                    if (response.status === 404) throw new Error("Seller not found");
                    throw new Error("Failed to fetch seller");
                }
                const data = await response.json();
                setSeller(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchSeller();
    }, [slug]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#B36979" />
            </View>
        );
    }

    if (error || !seller) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error || "Seller not found"}</Text>
                <Pressable onPress={() => router.back()} style={styles.backButtonSimple}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const memberSince = seller.createdAt
        ? new Date(seller.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '2025'; // Fallback

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ headerShown: false }} /> {/* We'll build our own header */}

            {/* Banner Section */}
            <View style={styles.bannerContainer}>
                {seller.banner ? (
                    <Image source={{ uri: seller.banner }} style={styles.banner} resizeMode="cover" />
                ) : (
                    <View style={[styles.banner, styles.bannerPlaceholder]}>
                        <View style={styles.patternDot} />
                        {/* Abstract Decorative Elements if no banner */}
                        <View style={[styles.abstractCircle, { top: -50, right: -50, width: 200, height: 200, backgroundColor: '#B3697920' }]} />
                        <View style={[styles.abstractCircle, { bottom: -30, left: 20, width: 100, height: 100, backgroundColor: '#567F4F20' }]} />
                    </View>
                )}

                {/* Custom Back Button overlay */}
                <SafeAreaView style={styles.headerOverlay}>
                    <Pressable onPress={() => router.back()} style={styles.backButtonCircle}>
                        <ArrowLeft size={24} color="#333" />
                    </Pressable>
                </SafeAreaView>
            </View>

            {/* Main Content Card - Overlapping Banner */}
            <View style={[styles.contentContainer, isDesktop ? styles.contentContainerDesktop : {}]}>

                {/* Profile Header Block */}
                <View style={styles.profileHeader}>
                    <View style={styles.logoWrapper}>
                        {seller.logo ? (
                            <Image source={{ uri: seller.logo }} style={styles.logo} />
                        ) : (
                            <View style={[styles.logo, styles.logoPlaceholder]}>
                                <Text style={styles.logoInitials}>{seller.name.charAt(0)}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.storeName}>{seller.name}</Text>

                        <View style={styles.metaRow}>
                            {seller.location && (
                                <View style={styles.metaItem}>
                                    <MapPin size={14} color="#666" />
                                    <Text style={styles.metaText}>{seller.location}</Text>
                                </View>
                            )}
                            <View style={styles.metaItem}>
                                <Calendar size={14} color="#666" />
                                <Text style={styles.metaText}>Joined {memberSince}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {seller.description && (
                    <View style={styles.section}>
                        <Text style={styles.description}>{seller.description}</Text>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Package size={20} color="#567F4F" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{seller.products?.length || 0}</Text>
                            <Text style={styles.statLabel}>Products</Text>
                        </View>
                    </View>

                    {/* Example Stats - these might not be in generic API yet but showing layout */}
                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Star size={20} color="#FF9800" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{seller.rating || '5.0'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FCE4EC' }]}>
                            <TrendingUp size={20} color="#B36979" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{seller.totalSales ? `${seller.totalSales}+` : 'New'}</Text>
                            <Text style={styles.statLabel}>Sales</Text>
                        </View>
                    </View>
                </View>

                {/* Products Section */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Shop Collection</Text>
                        <View style={styles.sectionLine} />
                    </View>

                    <ProductPage
                        category=""
                        title="" // Hidden as we use custom header
                        products={seller.products}
                        loading={false}
                        error={null}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FAFAFA',
    },
    errorText: {
        fontSize: 16,
        color: '#D32F2F',
        fontFamily: 'Quicksand',
        marginBottom: 16,
    },
    backButtonSimple: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#B36979',
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'Quicksand',
    },

    // Banner
    bannerContainer: {
        height: 220,
        width: '100%',
        position: 'relative',
    },
    banner: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        backgroundColor: '#EEEEEE',
        overflow: 'hidden',
    },
    abstractCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    patternDot: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.1, // Could add a pattern image here
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        padding: 16,
        zIndex: 10,
    },
    backButtonCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    // Main Content
    contentContainer: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        marginTop: -40, // Overlap banner
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 40,
        minHeight: 500,
    },
    contentContainerDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
        width: '100%',
        marginTop: -60,
    },

    // Profile Header
    profileHeader: {
        alignItems: 'center', // Center on mobile
        marginBottom: 20,
    },
    logoWrapper: {
        marginTop: -50, // Pull logo up
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 30, // Squircle-ish
        borderWidth: 4,
        borderColor: 'white',
        backgroundColor: 'white',
    },
    logoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#B36979',
    },
    logoInitials: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        fontFamily: 'Quicksand',
    },
    profileInfo: {
        alignItems: 'center',
    },
    storeName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#2C2C2C',
        marginBottom: 8,
        fontFamily: 'Quicksand',
    },
    metaRow: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Quicksand',
    },

    // Sections
    section: {
        marginBottom: 24,
    },
    description: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        textAlign: 'center',
        fontFamily: 'Quicksand',
        paddingHorizontal: 10,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        fontFamily: 'Quicksand',
    },

    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    sectionLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#F0F0F0',
    },
});
