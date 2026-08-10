import ProductCard from "@/components/product/ProductCard";
import { Product } from "@/types/products";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '@/lib/imagekit';
import ImageCropperModal from '@/components/seller/ImageCropperModal';
import StorefrontSkeleton from '@/components/seller/StorefrontSkeleton';
import { apiClient, sellerOrdersAPI, reviewsAPI } from "@/services/api";
import Animated, { LinearTransition, useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withTiming, withSpring, interpolate, Extrapolation, ZoomIn } from "react-native-reanimated";
import GlobalHeaderUI from "@/components/layout/GlobalHeaderUI";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    ListRenderItem,
    ScrollView,
    TextInput,
    Modal,
    Alert,
    Linking
} from "react-native";
import { ArrowLeft, MapPin, Calendar, Star, Package, TrendingUp, CheckCircle, Heart, MessageCircle, Truck, RefreshCw, ShieldCheck, Camera, Pin, PinOff, Edit2, Save, Search, X, Clock, Zap } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from '@/constants/theme';

import MenuSideBar from "@/components/layout/MenuSideBar";

interface SellerProfileData {
    uid: number;
    name: string;
    slug: string;
    email?: string | null;
    phone?: string | null;
    description?: string | null;
    logo?: string | null;
    banner?: string | null;
    products: Product[];
    createdAt?: string;
    location?: string | null;
    businessAddress?: string | null;
    totalSales?: number;
    rating?: number;
    trustScore?: number;
    responseRate?: number;
    responseTimeHours?: number;
    lastActiveAt?: string;
    pinnedProductIds?: number[];
    productCategories?: string[];
    salesChannels?: string[];
    isHandmade?: boolean;
    hasPriorExperience?: boolean;
    portfolioLink?: string | null;
}


type TabType = 'products' | 'about' | 'reviews';
type FilterType = 'All' | 'Newest' | 'Price: Low to High' | 'Handcrafted';

export default function SellerProfile() {
    const { slug } = useLocalSearchParams();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [seller, setSeller] = useState<SellerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewsMeta, setReviewsMeta] = useState<any>(null);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('products');
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [isEditingAbout, setIsEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showBannerFullScreen, setShowBannerFullScreen] = useState(false);
    const [showComingSoonModal, setShowComingSoonModal] = useState(false);
    const [comingSoonFeature, setComingSoonFeature] = useState('');
    const { user } = useAuth();

    // Image Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageUri, setCropImageUri] = useState<string | null>(null);
    const [targetImageField, setTargetImageField] = useState<'logo' | 'banner' | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');

    // Menu state for floating header
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Scroll Animation for Header
    const scrollY = useSharedValue(0);
    const lastScrollY = useSharedValue(0);
    const isScrollingUp = useSharedValue(true);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            if (currentY > lastScrollY.value && currentY > 50) {
                isScrollingUp.value = false;
            } else if (currentY < lastScrollY.value) {
                isScrollingUp.value = true;
            }
            lastScrollY.value = currentY;
            scrollY.value = currentY;
        }
    });

    const headerAnimatedStyle = useAnimatedStyle(() => {
        const translateY = withTiming(isScrollingUp.value || scrollY.value < 50 ? 0 : -100, { duration: 300 });
        return {
            transform: [{ translateY }],
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
        };
    });

    // Derived state
    // Derived state with seller info injection
    const activeProducts = seller?.products
        .filter((p: Product) => !p.status || p.status === 'ACTIVE')
        .map((p: Product) => ({ ...p, seller: p.seller || { name: seller.name, slug: seller.slug } }))
        .filter((p: any) => {
            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const nameMatch = p.name?.toLowerCase().includes(query);
                const descMatch = p.description?.toLowerCase().includes(query);
                const categoryMatch = p.categories?.some((c: string) => c.toLowerCase().includes(query));
                if (!nameMatch && !descMatch && !categoryMatch) return false;
            }
            // Category filter
            if (activeFilter === 'Handcrafted') {
                return p.categories && p.categories.some((c: string) => c.toLowerCase().includes('handcrafted'));
            }
            return true;
        })
        .sort((a: any, b: any) => {
            const isAPinned = seller?.pinnedProductIds?.includes(a.uid);
            const isBPinned = seller?.pinnedProductIds?.includes(b.uid);
            if (isAPinned && !isBPinned) return -1;
            if (!isAPinned && isBPinned) return 1;

            if (activeFilter === 'Price: Low to High') {
                return (Number(a.basePrice) || 0) - (Number(b.basePrice) || 0);
            }
            if (activeFilter === 'Newest') {
                return (b.uid || 0) - (a.uid || 0);
            }
            return 0;
        }) || [];

    const pendingProducts = seller?.products
        .filter((p: Product) => p.status === 'PENDING')
        .map((p: Product) => ({ ...p, seller: p.seller || { name: seller.name, slug: seller.slug } })) || [];

    const isOwner = user?.sellerProfile?.uid === seller?.uid;

    useEffect(() => {
        if (!slug) return;

        const fetchSeller = async () => {
            try {
                const response = await sellerOrdersAPI.getSellerBySlug(slug as string);
                const data = response.data;
                setSeller(data);
                setAboutText(data.description || '');
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError("Seller not found");
                } else {
                    setError(err instanceof Error ? err.message : "An error occurred");
                }
            } finally {
                setLoading(false);
            }
        };
        const fetchReviews = async () => {
            setLoadingReviews(true);
            try {
                const res = await reviewsAPI.getReviewsBySeller(slug as string);
                setReviews(res.data?.data || []);
                setReviewsMeta(res.data?.meta || null);
            } catch (err) {
                console.error("Failed to fetch reviews", err);
            } finally {
                setLoadingReviews(false);
            }
        };
        fetchSeller();
        fetchReviews();
    }, [slug]);

    const handlePickImage = async (field: 'logo' | 'banner') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setCropImageUri(result.assets[0].uri);
            setTargetImageField(field);
            setShowCropper(true);
            if (field === 'logo') setShowProfileModal(false);
        }
    };

    const handleCropComplete = async (uri: string) => {
        if (!targetImageField || !seller) return;
        setShowCropper(false);
        setUploadingImage(true);

        try {
            const uploadResult = await uploadToImageKit({
                uri,
                name: `${seller.slug}-${targetImageField}-${Date.now()}.jpg`
            });

            // Update Backend using apiClient (automatically adds auth token)
            await apiClient.put(`/sellers/${seller.uid}`, { [targetImageField]: uploadResult.url });

            // Update Local State
            setSeller({ ...seller, [targetImageField]: uploadResult.url });

        } catch (error) {
            alert('Failed to update image');
            console.error(error);
        } finally {
            setUploadingImage(false);
            setTargetImageField(null);
            setCropImageUri(null);
        }
    };

    if (loading) {
        return (
            <StorefrontSkeleton />
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
                return isOwner ? [...pendingProducts, ...activeProducts] : activeProducts;
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
            <View style={[styles.bannerContainer, isDesktop && styles.bannerContainerDesktop]}>
                {seller.banner ? (
                    <Pressable onPress={() => setShowBannerFullScreen(true)} style={{ flex: 1 }}>
                        <Image source={{ uri: seller.banner }} style={styles.banner} resizeMode="cover" />
                    </Pressable>
                ) : (
                    <View style={[styles.banner, styles.bannerPlaceholder]}>
                        <View style={styles.patternDot} />
                        <View style={[styles.abstractCircle, { top: -50, right: -50, width: 200, height: 200, backgroundColor: '#B3697920' }]} />
                        <View style={[styles.abstractCircle, { bottom: -30, left: 20, width: 100, height: 100, backgroundColor: '#567F4F20' }]} />
                    </View>
                )}

                {isOwner && (
                    <Pressable style={styles.editBannerButton} onPress={() => handlePickImage('banner')}>
                        {uploadingImage && targetImageField === 'banner' ? <ActivityIndicator size="small" color="white" /> : <Camera size={20} color="white" />}
                        <Text style={styles.editButtonText}>Edit Banner</Text>
                    </Pressable>
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
                        <Pressable onPress={() => isOwner && setShowProfileModal(true)}>
                            {seller.logo ? (
                                <Image source={{ uri: seller.logo }} style={styles.logo} />
                            ) : (
                                <View style={[styles.logo, styles.logoPlaceholder]}>
                                    <Text style={styles.logoInitials}>{seller.name.charAt(0)}</Text>
                                </View>
                            )}
                        </Pressable>

                        {/* Verification Badge */}
                        <View style={styles.verificationBadge}>
                            <CheckCircle size={16} color="white" fill="#4CAF50" />
                        </View>
                    </View>

                    <View style={styles.profileInfo}>
                        <Text style={styles.storeName}>{seller.name}</Text>

                        <View style={styles.metaRow}>
                            {seller.location && (
                                <View style={styles.metaItem}>
                                    <MapPin size={14} color={theme.colors.textSecondary} />
                                    <Text style={styles.metaText}>{seller.location}</Text>
                                </View>
                            )}
                            <View style={styles.metaItem}>
                                <Calendar size={14} color={theme.colors.textSecondary} />
                                <Text style={styles.metaText}>Joined {memberSince}</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtonsRow}>
                            <Pressable
                                style={styles.actionButtonPrimary}
                                onPress={() => { setComingSoonFeature('follow'); setShowComingSoonModal(true); }}
                            >
                                <Heart size={16} color="white" />
                                <Text style={styles.actionButtonTextPrimary}>Follow</Text>
                            </Pressable>
                            <Pressable
                                style={styles.actionButtonSecondary}
                                onPress={() => {
                                    if (seller.email) {
                                        Linking.openURL(`mailto:${seller.email}`);
                                    } else {
                                        Alert.alert("Contact Info", "This seller has not provided an email address.");
                                    }
                                }}
                            >
                                <MessageCircle size={16} color={theme.colors.primary} />
                                <Text style={styles.actionButtonTextSecondary}>Contact</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Description (Short) */}
                {seller.description && (
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
                            <Text style={styles.statValue}>{seller.rating && Number(seller.rating) > 0 ? seller.rating : 'New'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                            <ShieldCheck size={20} color="#567F4F" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{seller.trustScore || 100}</Text>
                            <Text style={styles.statLabel}>Trust Score</Text>
                        </View>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIcon, { backgroundColor: '#FCE4EC' }]}>
                            <TrendingUp size={20} color={theme.colors.primary} />
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
                        {/* Pending Products Section merged into main list */}

                        {/* Search Bar - Prominent Position */}
                        <View style={styles.searchContainer}>
                            <View style={styles.searchBar}>
                                <Search size={18} color={theme.colors.textLight} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search products..."
                                    placeholderTextColor={theme.colors.textLight}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                                        <X size={18} color={theme.colors.textLight} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Shop Collection</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
                            {(['All', 'Newest', 'Price: Low to High', 'Handcrafted'] as FilterType[]).map((filter) => (
                                <Pressable
                                    key={filter}
                                    style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                    onPress={() => setActiveFilter(filter)}
                                >
                                    <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        </>
    );

    const renderAboutSection = () => (
        <View style={[styles.aboutContainer, isDesktop && styles.aboutContainerDesktop]}>

            {/* Story / Description */}
            <View style={styles.aboutCard}>
                <View style={styles.aboutHeaderRow}>
                    <Text style={styles.aboutTitle}>About the Artisan</Text>
                    {isOwner && (
                        <Pressable onPress={async () => {
                            if (isEditingAbout) {
                                try {
                                    await apiClient.put(`/sellers/${seller.uid}`, { description: aboutText });
                                    setSeller({ ...seller, description: aboutText });
                                } catch (err) {
                                    console.error(err);
                                    alert("Failed to save description");
                                }
                            }
                            setIsEditingAbout(!isEditingAbout);
                        }} style={styles.editAboutButton}>
                            {isEditingAbout ? <Save size={18} color={theme.colors.primary} /> : <Edit2 size={18} color={theme.colors.textLight} />}
                        </Pressable>
                    )}
                </View>

                {isEditingAbout ? (
                    <TextInput
                        style={styles.aboutInput}
                        multiline
                        value={aboutText}
                        onChangeText={setAboutText}
                        placeholder="Tell your story..."
                    />
                ) : (
                    <Text style={styles.aboutText}>{seller.description || 'This artisan hasn\'t written a bio yet.'}</Text>
                )}
            </View>

            {/* Maker Details */}
            <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Maker Details</Text>

                {seller.createdAt && (
                    <View style={styles.policyItem}>
                        <Calendar size={18} color={theme.colors.textSecondary} />
                        <View style={styles.policyTextContainer}>
                            <Text style={styles.policyTitle}>Member since</Text>
                            <Text style={styles.policyDesc}>
                                {new Date(seller.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                    </View>
                )}

                {(seller.businessAddress || seller.location) && (
                    <View style={styles.policyItem}>
                        <MapPin size={18} color={theme.colors.textSecondary} />
                        <View style={styles.policyTextContainer}>
                            <Text style={styles.policyTitle}>Location</Text>
                            <Text style={styles.policyDesc}>{seller.businessAddress || seller.location}</Text>
                        </View>
                    </View>
                )}

                {seller.phone && (
                    <View style={styles.policyItem}>
                        <MessageCircle size={18} color={theme.colors.textSecondary} />
                        <View style={styles.policyTextContainer}>
                            <Text style={styles.policyTitle}>Contact</Text>
                            <Text style={styles.policyDesc}>{seller.phone}</Text>
                        </View>
                    </View>
                )}

                {seller.portfolioLink && (
                    <View style={styles.policyItem}>
                        <TrendingUp size={18} color={theme.colors.textSecondary} />
                        <View style={styles.policyTextContainer}>
                            <Text style={styles.policyTitle}>Portfolio</Text>
                            <Text style={[styles.policyDesc, { color: theme.colors.primary }]}>{seller.portfolioLink}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.policyItem}>
                    <Clock size={18} color={theme.colors.textSecondary} />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Last Active</Text>
                        <Text style={styles.policyDesc}>
                            {seller.lastActiveAt ? (
                                (new Date().getTime() - new Date(seller.lastActiveAt).getTime()) < 24 * 60 * 60 * 1000 
                                ? 'Today' : 'Recently'
                            ) : 'Active'}
                        </Text>
                    </View>
                </View>

                <View style={styles.policyItem}>
                    <Zap size={18} color={theme.colors.textSecondary} />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Typical Response Time</Text>
                        <Text style={styles.policyDesc}>
                            {seller.responseTimeHours 
                                ? (seller.responseTimeHours < 1 ? '< 1 hour' : `About ${Math.round(seller.responseTimeHours)} hours`) 
                                : '< 1 hour'}
                        </Text>
                    </View>
                </View>

                {seller.hasPriorExperience && (
                    <View style={styles.policyItem}>
                        <CheckCircle size={18} color={theme.colors.success || '#22c55e'} />
                        <View style={styles.policyTextContainer}>
                            <Text style={styles.policyTitle}>Experienced Seller</Text>
                            <Text style={styles.policyDesc}>This maker has prior selling experience.</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Categories */}
            {seller.productCategories && seller.productCategories.length > 0 && (
                <View style={styles.aboutCard}>
                    <Text style={styles.aboutTitle}>Craft Categories</Text>
                    <View style={styles.tagsRow}>
                        {seller.productCategories.map((cat) => (
                            <View key={cat} style={styles.tagChip}>
                                <Text style={styles.tagChipText}>{cat}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Platform Trust */}
            <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>Platform Guarantees</Text>

                <View style={styles.policyItem}>
                    <ShieldCheck size={18} color={theme.colors.textSecondary} />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Verified Artisan</Text>
                        <Text style={styles.policyDesc}>Identity verified by Knot & Bloom. All listings are reviewed before going live.</Text>
                    </View>
                </View>

                <View style={styles.policyItem}>
                    <Truck size={18} color={theme.colors.textSecondary} />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>COD Deposit Protection</Text>
                        <Text style={styles.policyDesc}>A 20% deposit is collected upfront on COD orders, protecting this seller from refused deliveries.</Text>
                    </View>
                </View>

                <View style={styles.policyItem}>
                    <RefreshCw size={18} color={theme.colors.textSecondary} />
                    <View style={styles.policyTextContainer}>
                        <Text style={styles.policyTitle}>Dispute Resolution</Text>
                        <Text style={styles.policyDesc}>All orders are backed by Knot & Bloom's dispute resolution process.</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderReviewsSection = () => {
        if (loadingReviews) {
            return (
                <View style={[styles.reviewsContainer, isDesktop && styles.reviewsContainerDesktop]}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            );
        }

        if (reviews.length === 0) {
            return (
                <View style={[styles.reviewsContainer, isDesktop && styles.reviewsContainerDesktop]}>
                    <View style={styles.emptyState}>
                        <MessageCircle size={40} color={theme.colors.border} />
                        <Text style={styles.emptyStateText}>No reviews yet</Text>
                        <Text style={styles.emptyStateSubtext}>Be the first to leave a review for this seller!</Text>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.reviewsContainer, isDesktop && styles.reviewsContainerDesktop]}>
                <View style={styles.reviewsHeader}>
                    <Text style={styles.reviewsTitle}>Customer Reviews ({reviewsMeta?.totalCount || 0})</Text>
                    <View style={styles.ratingOverview}>
                        <Star size={24} color="#FF9800" fill="#FF9800" />
                        <Text style={styles.averageRating}>
                            {reviewsMeta?.averageRating ? reviewsMeta.averageRating.toFixed(1) : 0}
                        </Text>
                    </View>
                </View>

                {reviews.map((review) => (
                    <View key={review.uid} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                            <View style={styles.reviewerInfo}>
                                {review.user?.avatar ? (
                                    <Image source={{ uri: review.user.avatar }} style={styles.reviewerAvatar} />
                                ) : (
                                    <View style={[styles.reviewerAvatar, styles.avatarPlaceholder]}>
                                        <Text style={styles.avatarInitials}>{review.user?.name?.charAt(0) || 'U'}</Text>
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
                                    <Text style={styles.reviewDate}>
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.starRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={14}
                                        color={star <= review.rating ? "#FF9800" : theme.colors.border}
                                        fill={star <= review.rating ? "#FF9800" : "transparent"}
                                    />
                                ))}
                            </View>
                        </View>

                        {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
                        <Text style={styles.reviewText}>{review.content}</Text>

                        {review.product && (
                            <View style={styles.reviewProduct}>
                                <Text style={styles.reviewProductText}>Purchased: {review.product.name}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        );
    };

    const renderItem: ListRenderItem<any> = ({ item }) => {
        if (activeTab === 'products') {
            return (
                <Animated.View
                    layout={LinearTransition.springify().damping(15)}
                    style={[
                        styles.productWrapper,
                        isDesktop ? styles.productWrapperDesktop : styles.productWrapperMobile
                    ]}
                >
                    <ProductCard
                        product={item}
                        style={{ marginBottom: 0 }}
                        isPinned={seller?.pinnedProductIds?.includes(item.uid)}
                        onPinPress={isOwner ? () => {
                            const currentPinned = seller.pinnedProductIds || [];
                            const newPinned = currentPinned.includes(item.uid)
                                ? currentPinned.filter((id: number) => id !== item.uid)
                                : [...currentPinned, item.uid];
                            setSeller({ ...seller, pinnedProductIds: newPinned });
                        } : undefined}
                    />

                    {/* Pinned Badge for Visitors (and Owner) */}
                    {seller?.pinnedProductIds?.includes(item.uid) && (
                        <View style={styles.pinnedBadge}>
                            <Pin size={10} color="white" fill="white" />
                            <Text style={styles.pinnedBadgeText}>Pinned</Text>
                        </View>
                    )}
                </Animated.View>
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

            <Animated.View style={headerAnimatedStyle}>
                <GlobalHeaderUI
                    setIsMenuOpen={setIsMenuOpen}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                />
            </Animated.View>
            <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <Animated.FlatList
                onScroll={onScroll}
                scrollEventThrottle={16}
                data={loadTabContent()}
                keyExtractor={(item: any, index: number) => item.uid ? String(item.uid) : `item-${index}`}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                numColumns={activeTab === 'products' ? (isDesktop ? 4 : 2) : 1}
                key={activeTab === 'products' ? (isDesktop ? 'desktop-grid' : 'mobile-grid') : 'single-col'}
                columnWrapperStyle={activeTab === 'products' ? [
                    styles.productList,
                    isDesktop && styles.productListDesktop
                ] : undefined}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}
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

            {/* Coming Soon Modal */}
            <Modal
                visible={showComingSoonModal}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowComingSoonModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowComingSoonModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Pressable style={styles.modalCloseButton} onPress={() => setShowComingSoonModal(false)}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </Pressable>

                        <Text style={styles.modalTitle}>Coming Soon!</Text>

                        <Text style={{ textAlign: 'center', marginBottom: 24, fontFamily: 'Quicksand', color: theme.colors.text, fontSize: 16 }}>
                            The {comingSoonFeature} feature is currently under development. Stay tuned!
                        </Text>

                        <Pressable style={styles.uploadButton} onPress={() => setShowComingSoonModal(false)}>
                            <Text style={styles.uploadButtonText}>Got it</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Profile Customization Modal */}
            <Modal
                visible={showProfileModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowProfileModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowProfileModal(false)}
                >
                    <View style={styles.modalContent}>
                        <Pressable style={styles.modalCloseButton} onPress={() => setShowProfileModal(false)}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </Pressable>

                        <Text style={styles.modalTitle}>Customize Profile</Text>

                        <View style={styles.modalImageWrapper}>
                            {seller?.logo ? (
                                <Image source={{ uri: seller.logo }} style={styles.modalImage} />
                            ) : (
                                <View style={[styles.modalImage, styles.logoPlaceholder]}>
                                    <Text style={[styles.logoInitials, { fontSize: 48 }]}>
                                        {seller?.name.charAt(0)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <Pressable style={styles.uploadButton} onPress={() => handlePickImage('logo')}>
                            {uploadingImage && targetImageField === 'logo' ? <ActivityIndicator size="small" color="white" /> : <Camera size={20} color="white" />}
                            <Text style={styles.uploadButtonText}>Upload New Photo</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Banner Full-Screen Modal */}
            <Modal
                visible={showBannerFullScreen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowBannerFullScreen(false)}
            >
                <Pressable
                    style={styles.bannerModalOverlay}
                    onPress={() => setShowBannerFullScreen(false)}
                >
                    <Pressable style={styles.bannerModalCloseBtn} onPress={() => setShowBannerFullScreen(false)}>
                        <X size={22} color="white" />
                    </Pressable>
                    {seller?.banner && (
                        <Image
                            source={{ uri: seller.banner }}
                            style={styles.bannerFullScreenImage}
                            resizeMode="contain"
                        />
                    )}
                </Pressable>
            </Modal>

            {/* Image Cropper Modal */}
            <ImageCropperModal
                visible={showCropper}
                imageUri={cropImageUri}
                onCrop={handleCropComplete}
                onSkip={() => setShowCropper(false)}
                onCancel={() => setShowCropper(false)}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: theme.colors.background,
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
        backgroundColor: theme.colors.primary,
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
    bannerContainerDesktop: {
        maxWidth: 1024,
        alignSelf: 'center',
    },
    banner: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        backgroundColor: theme.colors.border,
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
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    // Main Content
    contentContainer: {
        backgroundColor: theme.colors.background,
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
        backgroundColor: theme.colors.primary,
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
        color: theme.colors.text,
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
        color: theme.colors.textSecondary,
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
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: theme.colors.primary,
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
        borderColor: theme.colors.primary,
    },
    actionButtonTextSecondary: {
        color: theme.colors.primary,
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
        color: theme.colors.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
        fontFamily: 'Quicksand',
        paddingHorizontal: 10,
    },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: 150,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: theme.colors.shadow,
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
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
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
        color: theme.colors.textLight,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '60%',
        height: 3,
        backgroundColor: theme.colors.primary,
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
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    sectionLine: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.subtle,
    },

    // Product List & Grid
    productWrapper: {
        padding: 2, // Space between grid items
    },

    productWrapperMobile: {
        width: '50%',
    },
    productWrapperDesktop: {
        width: '25%',
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
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },

    // About Section
    aboutContainer: {
        paddingHorizontal: 16,
        gap: 16,
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
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    tagChip: {
        backgroundColor: theme.colors.subtle,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    tagChipText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
    },
    aboutTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12,
        fontFamily: 'Quicksand',
    },
    aboutText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        fontFamily: 'Quicksand',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
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
        color: theme.colors.text,
        marginBottom: 4,
        fontFamily: 'Quicksand',
    },
    policyDesc: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        fontFamily: 'Quicksand',
    },

    // Reviews
    reviewsContainer: {
        paddingVertical: 24,
        paddingHorizontal: 16,
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
        color: theme.colors.border,
        fontFamily: 'Quicksand',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    reviewsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    ratingOverview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    averageRating: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF9800',
        fontFamily: 'Quicksand',
    },
    reviewCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        width: '100%',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        backgroundColor: theme.colors.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        fontFamily: 'Quicksand',
    },
    reviewerName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    starRow: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 4,
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 22,
        fontFamily: 'Quicksand',
        marginBottom: 12,
    },
    reviewProduct: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    reviewProductText: {
        fontSize: 12,
        color: theme.colors.textLight,
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
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    filterTextActive: {
        color: 'white',
    },


    // Editing Controls
    editBannerButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 20,
    },
    editButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
        fontFamily: 'Quicksand',
    },
    editLogoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 5,
    },

    // Pinning
    pinButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 20,
    },
    pinButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    pinnedBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 20,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    pinnedBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },

    // New Profile Styles
    centeredCameraIcon: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 30,
    },

    // About Edit Styles
    aboutHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    editAboutButton: {
        padding: 8,
    },
    aboutInput: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 24,
        fontFamily: 'Quicksand',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 12,
        minHeight: 100,
        textAlignVertical: 'top',
        backgroundColor: theme.colors.background,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
        position: 'relative',
    },
    modalCloseButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
    },
    modalCloseText: {
        fontSize: 20,
        color: theme.colors.textLight,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 24,
        fontFamily: 'Quicksand',
    },
    modalImageWrapper: {
        marginBottom: 24,
        shadowColor: theme.colors.shadow,
        borderRadius: 50, // Squircle
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    modalImage: {
        width: 150,
        height: 150,
        borderRadius: 50, // Squircle
        borderWidth: 4,
        borderColor: 'white',
    },
    uploadButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        width: '100%',
        justifyContent: 'center',
    },
    uploadButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Quicksand',
    },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
        marginTop: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.subtle,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        height: '100%',
        borderWidth: 0,
        outlineStyle: 'none' as any,
    },

    // Banner Full-Screen Modal
    bannerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerModalCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerFullScreenImage: {
        width: '95%',
        height: '60%',
        borderRadius: 8,
    },
});
