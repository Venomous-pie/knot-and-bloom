
import ProductPage from "@/components/ProductPage";
import { Product } from "@/types/products";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

interface SellerProfileData {
    name: string;
    slug: string;
    description?: string;
    logo?: string;
    banner?: string;
    products: Product[];
}

export default function SellerProfile() {
    const { slug } = useLocalSearchParams();
    const [seller, setSeller] = useState<SellerProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fetchSeller = async () => {
            try {
                // Adjust URL based on environment/config. Assuming relative /api works with proxy or absolute
                // In React Native/Expo, we usually need absolute URL or configured client.
                // Assuming global fetch works with configured base URL or using relative for web.
                // If native, likely need full URL. For now, assuming web-first or proxy setup.
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
                <ActivityIndicator size="large" color="#5A4A42" />
            </View>
        );
    }

    if (error || !seller) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error || "Seller not found"}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: seller.name }} />

            {/* Banner */}
            {seller.banner ? (
                <Image source={{ uri: seller.banner }} style={styles.banner} resizeMode="cover" />
            ) : (
                <View style={[styles.banner, styles.bannerPlaceholder]} />
            )}

            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    {seller.logo ? (
                        <Image source={{ uri: seller.logo }} style={styles.logo} />
                    ) : (
                        <View style={[styles.logo, styles.logoPlaceholder]}>
                            <Text style={styles.logoText}>{seller.name.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{seller.name}</Text>
                    {seller.description && <Text style={styles.description}>{seller.description}</Text>}
                </View>
            </View>

            {/* Products List reuse */}
            <View style={styles.productsSection}>
                <ProductPage
                    category=""
                    title="Products"
                    products={seller.products}
                    loading={false}
                    error={null}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    errorText: {
        fontSize: 18,
        color: '#DC2626'
    },
    banner: {
        width: '100%',
        height: 150,
    },
    bannerPlaceholder: {
        backgroundColor: '#F5F5F5' // Muted gray
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -32, // Overlap banner
    },
    logoContainer: {
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    logoPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#D4A574' // Amber
    },
    logoText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF'
    },
    info: {
        flex: 1,
        marginTop: 32, // Align with name below overlap
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2C2C2C',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#7A7A7A',
    },
    productsSection: {
        flex: 1,
        minHeight: 500, // Ensure FlatList has space if simpler View used
    }
});
