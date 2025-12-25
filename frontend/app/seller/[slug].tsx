import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/products";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    FlatList,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    ListRenderItem,
    ScrollView
} from "react-native";
import { ArrowLeft, MapPin, Calendar, Star, Package, TrendingUp, CheckCircle, Heart, MessageCircle, Truck, RefreshCw, ShieldCheck } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/app/auth";

interface SellerProfileData {
    uid: number;
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

type TabType = 'products' | 'about' | 'reviews';

export default function SellerProfile() {
    const { slug } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [seller, setSeller] = useState<SellerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('products');
    const { user } = useAuth();

    // Derived state
    const activeProducts = seller?.products.filter(p => !p.status || p.status === 'ACTIVE') || [];
    const pendingProducts = seller?.products.filter(p => p.status === 'PENDING') || [];
    const isOwner = user?.sellerId === seller?.uid;

    useEffect(() => {
        if (!slug) return;

        const fetchSeller = async () => {
            try {
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
        : '2025';

    // Tabs Config
    const loadTabContent = () => {
        if (!seller) return [];
        switch (activeTab) {
            case 'products':
                return activeProducts;
            case 'about':
                return ['about-section']; // Dummy item to render single functional component
            case 'reviews':
                return ['reviews-section']; // Dummy item
            default:
                return [];
        }
    };

    const renderHeader = () => (
        <>
            {/* Banner Section */}
            <View style={styles.bannerContainer}>
                {seller.banner ? (
                    <Image source={{ uri: seller.banner }} style={styles.banner} resizeMode="cover" />
                ) : (
                    <View style={[styles.banner, styles.bannerPlaceholder]}>
                        <View style={styles.patternDot} />
                        <View style={[styles.abstractCircle, { top: -50, right: -50, width: 200, height: 200, backgroundColor: '#B3697920' }]} />
                        <View style={[styles.abstractCircle, { bottom: -30, left: 20, width: 100, height: 100, backgroundColor: '#567F4F20' }]} />
                    </View>
                )}

                <SafeAreaView style={styles.headerOverlay}>
                    <Pressable onPress={() => router.back()} style={styles.backButtonCircle}>
                        <ArrowLeft size={24} color="#333" />
                    </Pressable>
                </SafeAreaView>
            </View>

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
                        {/* Verification Badge - Always show for now or logic here */}
                        <View style={styles.verificationBadge}>
                            <CheckCircle size={16} color="white" fill="#4CAF50" />
                        </View>
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

                        <View style={styles.actionButtonsRow}>
                            <Pressable style={styles.actionButtonPrimary}>
                                <Heart size={16} color="white" />
                                <Text style={styles.actionButtonTextPrimary}>Follow</Text>
                            </Pressable>
                            <Pressable style={styles.actionButtonSecondary}>
                                <MessageCircle size={16} color="#B36979" />
                                <Text style={styles.actionButtonTextSecondary}>Contact</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Description (Short) */}
                {seller.description && activeTab === 'products' && (
                    <View style={styles.section}>
                        <Text style={styles.description} numberOfLines={3}>{seller.description}</Text>
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

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <Pressable
                        style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('products')}
                    >
                        <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>Products</Text>
                        {activeTab === 'products' && <View style={styles.activeIndicator} />}
                    </Pressable>
                    <Pressable
                        style={[styles.tabButton, activeTab === 'about' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('about')}
                    >
                        <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text>
                        {activeTab === 'about' && <View style={styles.activeIndicator} />}
                    </Pressable>
                    <Pressable
                        style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
                        onPress={() => setActiveTab('reviews')}
                    >
                        <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>Reviews</Text>
                        {activeTab === 'reviews' && <View style={styles.activeIndicator} />}
                    </Pressable>
                </View>

                {activeTab === 'products' && (
                    <View>
                        {/* Pending Products Section (Owner Only) */}
                        {isOwner && pendingProducts.length > 0 && (
                            <View style={styles.pendingSection}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.pendingBadge}>
                                        <Text style={styles.pendingBadgeText}>Pending Approval</Text>
                                    </View>
                                    <View style={styles.sectionLine} />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingList}>
                                    {pendingProducts.map((product) => (
                                        <View key={product.uid} style={styles.pendingCardWrapper}>
                                            <ProductCard product={product} style={styles.productCardFixed} />
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Shop Collection</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                            <Pressable style={[styles.filterChip, styles.filterChipActive]}>
                                <Text style={[styles.filterText, styles.filterTextActive]}>All</Text>
                            </Pressable>
                            <Pressable style={styles.filterChip}>
                                <Text style={styles.filterText}>Newest</Text>
                            </Pressable>
                            <Pressable style={styles.filterChip}>
                                <Text style={styles.filterText}>Price: Low to High</Text>
                            </Pressable>
                            <Pressable style={styles.filterChip}>
                                <Text style={styles.filterText}>Handcrafted</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                )}
            </View>
        </>
    );

    const renderAboutSection = () => (
        <View style={[styles.aboutContainer, isDesktop && styles.aboutContainerDesktop]}>
            <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>About the Artisan</Text>
                <Text style={styles.aboutText}>{seller.description || "No description available."}</Text>

                <View style={styles.divider} />

                <Text style={styles.aboutTitle}>Store Policies</Text>

                <View style={styles.policyItem}>
                    <Truck size={20} color="#555" />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Shipping</Text>
                        <Text style={styles.policyDesc}>Ships within 1-3 business days. Free shipping on orders over $50.</Text>
                    </View>
                </View>

                <View style={styles.policyItem}>
                    <RefreshCw size={20} color="#555" />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Returns</Text>
                        <Text style={styles.policyDesc}>Accepted within 14 days of delivery. Buyer pays return shipping.</Text>
                    </View>
                </View>

                <View style={styles.policyItem}>
                    <ShieldCheck size={20} color="#555" />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Handcrafted Guarantee</Text>
                        <Text style={styles.policyDesc}>All items are handmade with care and attention to detail.</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderReviewsSection = () => (
        <View style={[styles.reviewsContainer, isDesktop && styles.reviewsContainerDesktop]}>
            <View style={styles.emptyState}>
                <MessageCircle size={40} color="#DDD" />
                <Text style={styles.emptyStateText}>No reviews yet</Text>
                <Text style={styles.emptyStateSubtext}>Be the first to leave a review for this seller!</Text>
            </View>
        </View>
    );

    const renderItem: ListRenderItem<any> = ({ item }) => {
        if (activeTab === 'products') {
            return (
                <View style={[
                    styles.productWrapper,
                    isDesktop ? styles.productWrapperDesktop : styles.productWrapperMobile
                ]}>
                    <ProductCard product={item} />
                </View>
            );
        } else if (activeTab === 'about') {
            return renderAboutSection();
        } else if (activeTab === 'reviews') {
            return renderReviewsSection();
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <FlatList
                data={loadTabContent()}
                keyExtractor={(item, index) => item.uid ? String(item.uid) : `item-${index}`}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                numColumns={activeTab === 'products' ? (isDesktop ? 3 : 2) : 1}
                key={activeTab === 'products' ? (isDesktop ? 'desktop-grid' : 'mobile-grid') : 'single-col'}
                columnWrapperStyle={activeTab === 'products' ? [
                    styles.productList,
                    isDesktop && styles.productListDesktop
                ] : undefined}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    activeTab === 'products' ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {activeProducts.length === 0 && pendingProducts.length > 0 && isOwner
                                    ? "No active products visible to customers"
                                    : "No products found"}
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
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
        opacity: 0.1,
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
        backgroundColor: '#FAFAFA',
        marginTop: -40, // Overlap banner
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 0,
    },
    contentContainerDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
        width: '100%',
        marginTop: -60,
    },

    // Profile Header
    profileHeader: {
        alignItems: 'center',
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
        position: 'relative',
    },
    verificationBadge: {
        position: 'absolute',
        bottom: 0,
        right: -4,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 2,
    },
    logo: {
        width: 100,
        height: 100,
        borderRadius: 30, // Squircle-ish
        borderWidth: 4,
        borderColor: 'white',
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
        width: '100%',
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
        marginBottom: 16,
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

    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    actionButtonPrimary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#B36979',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: "#B36979",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonTextPrimary: {
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Quicksand',
        fontSize: 14,
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#B36979',
    },
    actionButtonTextSecondary: {
        color: '#B36979',
        fontWeight: '600',
        fontFamily: 'Quicksand',
        fontSize: 14,
    },

    // Sections
    section: {
        marginBottom: 16,
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

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        marginBottom: 24,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        position: 'relative',
    },
    tabButtonActive: {
        // 
    },
    tabText: {
        fontSize: 15,
        color: '#888',
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    tabTextActive: {
        color: '#B36979',
        fontWeight: 'bold',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '60%',
        height: 3,
        backgroundColor: '#B36979',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
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

    // Product List & Grid
    productWrapper: {
        padding: 4, // Space between grid items
        height: 380, // Fixed height for uniformity
    },
    productCardFixed: {
        flex: 1,
        marginBottom: 0,
    },
    productWrapperMobile: {
        width: '50%',
    },
    productWrapperDesktop: {
        width: '33.33%',
    },
    productList: {
        justifyContent: 'flex-start', // Prevent spreading to edges for incomplete rows
        paddingHorizontal: 16, // Match content container padding minus item padding
        flexWrap: 'wrap',
    },
    productListDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
        width: '100%',
    },

    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        fontFamily: 'Quicksand',
    },

    // About Section
    aboutContainer: {
        paddingHorizontal: 16,
    },
    aboutContainerDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
        width: '100%',
    },
    aboutCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    aboutTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        fontFamily: 'Quicksand',
    },
    aboutText: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        fontFamily: 'Quicksand',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 24,
    },
    policyItem: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20,
    },
    policyTextContainer: {
        flex: 1,
    },
    policyTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 4,
        fontFamily: 'Quicksand',
    },
    policyDesc: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        fontFamily: 'Quicksand',
    },

    // Reviews
    reviewsContainer: {
        paddingTop: 40,
        alignItems: 'center',
    },
    reviewsContainerDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
        width: '100%',
    },
    emptyState: {
        alignItems: 'center',
        gap: 12,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DDD',
        fontFamily: 'Quicksand',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#AAA',
        fontFamily: 'Quicksand',
    },
    // Filter Row
    filterRow: {
        marginBottom: 16,
    },
    filterContent: {
        gap: 8,
        paddingRight: 20,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    filterChipActive: {
        backgroundColor: '#B36979',
        borderColor: '#B36979',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    filterTextActive: {
        color: 'white',
    },

    // Pending Section
    pendingSection: {
        marginBottom: 32,
    },
    pendingBadge: {
        backgroundColor: '#FFF4E5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFB74D',
    },
    pendingBadgeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#F57C00',
        fontFamily: 'Quicksand',
    },
    pendingList: {
        paddingRight: 20,
        gap: 16,
        paddingTop: 10,
    },
    pendingCardWrapper: {
        width: 200,
        height: 380, // Fixed height to match grid
    },
});
