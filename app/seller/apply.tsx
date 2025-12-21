import { useAuth } from "@/app/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SellerApplyPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    const [shopName, setShopName] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [bannerUrl, setBannerUrl] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/auth/login" as RelativePathString);
        }
    }, [user, authLoading]);

    // Check if already a seller
    const isAlreadySeller = user?.sellerId || user?.role === "SELLER";

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Shop name validation
        const trimmedName = shopName.trim();
        if (!trimmedName) {
            newErrors.shopName = "Shop name is required";
        } else if (trimmedName.length < 3) {
            newErrors.shopName = "Shop name must be at least 3 characters";
        } else if (trimmedName.length > 50) {
            newErrors.shopName = "Shop name must be 50 characters or less";
        } else if (!/^[a-zA-Z0-9\s\-]+$/.test(trimmedName)) {
            newErrors.shopName = "Only letters, numbers, spaces, and hyphens allowed";
        }

        // Description validation
        if (description.length > 500) {
            newErrors.description = "Description must be 500 characters or less";
        }

        // URL validation
        const urlPattern = /^(https?:\/\/)[^\s]+$/;
        if (logoUrl && !urlPattern.test(logoUrl)) {
            newErrors.logoUrl = "Please enter a valid URL (starting with http:// or https://)";
        }
        if (bannerUrl && !urlPattern.test(bannerUrl)) {
            newErrors.bannerUrl = "Please enter a valid URL (starting with http:// or https://)";
        }

        // Terms validation
        if (!termsAccepted) {
            newErrors.terms = "You must agree to the Seller Terms to continue";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("authToken");
            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3030"}/api/sellers/onboard`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: shopName.trim(),
                        description: description.trim() || undefined,
                        logo: logoUrl.trim() || undefined,
                        banner: bannerUrl.trim() || undefined,
                    }),
                }
            );

            if (response.status === 401) {
                router.replace("/auth/login" as RelativePathString);
                return;
            }

            if (response.status === 409) {
                setErrors({ general: "You've already applied as a seller" });
                return;
            }

            if (!response.ok) {
                const data = await response.json();
                setErrors({ general: data.error || "Something went wrong. Please try again." });
                return;
            }

            // Success - refresh user context and redirect
            await refreshUser();
            router.replace("/seller/application-submitted" as RelativePathString);
        } catch (error) {
            console.error(error);
            setErrors({ general: "Network error. Please check your connection." });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View style={[styles.contentContainer, isDesktop ? styles.row : styles.column]}>
                    {/* Left Side - Branding */}
                    <View style={[styles.brandingSection, isDesktop ? { width: "50%" } : { width: "100%", paddingVertical: 40 }]}>
                        <View style={styles.decorativeCircle1} />
                        <View style={styles.decorativeCircle2} />
                        <View style={styles.decorativeCircle3} />

                        <View style={styles.brandingContent}>
                            <Text style={{ fontSize: 40, marginBottom: 20 }}>🏪</Text>
                            <Text style={styles.brandTitle}>Become a Seller</Text>
                            <Text style={styles.brandSubtitle}>
                                Join our community of artisans and share your handcrafted creations with the world
                            </Text>
                            <View style={styles.featuresList}>
                                <Text style={styles.featureItem}>• Reach thousands of customers</Text>
                                <Text style={styles.featureItem}>• Set your own prices and policies</Text>
                                <Text style={styles.featureItem}>• Easy-to-use seller dashboard</Text>
                                <Text style={styles.featureItem}>• Secure payments and support</Text>
                            </View>
                        </View>
                        <View style={styles.decorativeCircleBig} />
                    </View>

                    {/* Right Side - Form */}
                    <View style={[styles.formSection, isDesktop ? { width: "50%" } : { width: "100%" }]}>
                        <View style={styles.formContent}>
                            {isAlreadySeller ? (
                                <View style={styles.alreadySellerContainer}>
                                    <Text style={{ fontSize: 48, marginBottom: 20 }}>✅</Text>
                                    <Text style={styles.welcomeTitle}>Already Applied!</Text>
                                    <Text style={styles.welcomeSubtitle}>
                                        {user?.sellerStatus === "PENDING"
                                            ? "Your application is pending review. We'll notify you once approved."
                                            : "You're already a seller! Head to your dashboard to manage your shop."}
                                    </Text>
                                    <Pressable
                                        style={styles.submitButton}
                                        onPress={() => router.push("/seller-dashboard/orders" as RelativePathString)}
                                    >
                                        <Text style={styles.submitButtonText}>Go to Seller Dashboard →</Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <>
                                    <Text style={styles.welcomeTitle}>Start Selling</Text>
                                    <Text style={styles.welcomeSubtitle}>
                                        Fill out the form below to apply as a seller
                                    </Text>

                                    {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}

                                    <Text style={styles.label}>Shop Name *</Text>
                                    <TextInput
                                        style={[styles.input, errors.shopName && styles.inputError]}
                                        value={shopName}
                                        onChangeText={setShopName}
                                        placeholder="My Crochet Shop"
                                        placeholderTextColor="#999"
                                        maxLength={50}
                                        editable={!loading}
                                    />
                                    {errors.shopName && <Text style={styles.fieldError}>{errors.shopName}</Text>}
                                    <Text style={styles.charCount}>{shopName.length}/50</Text>

                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                                        value={description}
                                        onChangeText={setDescription}
                                        placeholder="Tell customers about your shop and what you create..."
                                        placeholderTextColor="#999"
                                        multiline
                                        numberOfLines={4}
                                        maxLength={500}
                                        editable={!loading}
                                    />
                                    {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
                                    <Text style={styles.charCount}>{description.length}/500</Text>

                                    <Text style={styles.label}>Logo URL</Text>
                                    <TextInput
                                        style={[styles.input, errors.logoUrl && styles.inputError]}
                                        value={logoUrl}
                                        onChangeText={setLogoUrl}
                                        placeholder="https://example.com/logo.png"
                                        placeholderTextColor="#999"
                                        autoCapitalize="none"
                                        editable={!loading}
                                    />
                                    {errors.logoUrl && <Text style={styles.fieldError}>{errors.logoUrl}</Text>}

                                    <Text style={styles.label}>Banner URL</Text>
                                    <TextInput
                                        style={[styles.input, errors.bannerUrl && styles.inputError]}
                                        value={bannerUrl}
                                        onChangeText={setBannerUrl}
                                        placeholder="https://example.com/banner.png"
                                        placeholderTextColor="#999"
                                        autoCapitalize="none"
                                        editable={!loading}
                                    />
                                    {errors.bannerUrl && <Text style={styles.fieldError}>{errors.bannerUrl}</Text>}

                                    {/* Terms Checkbox */}
                                    <Pressable
                                        style={styles.termsContainer}
                                        onPress={() => !loading && setTermsAccepted(!termsAccepted)}
                                    >
                                        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                                            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={styles.termsText}>
                                            I agree to the{" "}
                                            <Text style={styles.termsLink}>Seller Terms and Conditions</Text>
                                        </Text>
                                    </Pressable>
                                    {errors.terms && <Text style={styles.fieldError}>{errors.terms}</Text>}

                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.submitButton,
                                            pressed && styles.submitButtonPressed,
                                            loading && styles.submitButtonDisabled,
                                        ]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                                <ActivityIndicator color="white" />
                                                <Text style={styles.submitButtonText}>Submitting...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.submitButtonText}>Submit Application →</Text>
                                        )}
                                    </Pressable>

                                    <Pressable
                                        style={styles.backLink}
                                        onPress={() => router.back()}
                                    >
                                        <Text style={styles.backLinkText}>← Back to shopping</Text>
                                    </Pressable>
                                </>
                            )}
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
        backgroundColor: "#fff",
    },
    contentContainer: {
        flex: 1,
    },
    row: {
        flexDirection: "row",
    },
    column: {
        flexDirection: "column",
    },
    brandingSection: {
        backgroundColor: "#F9F5F3",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        padding: 40,
        minHeight: 300,
    },
    brandingContent: {
        zIndex: 2,
        alignItems: "center",
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    brandSubtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginBottom: 30,
        maxWidth: 300,
        lineHeight: 24,
    },
    featuresList: {
        alignItems: "flex-start",
    },
    featureItem: {
        fontSize: 14,
        color: "#888",
        marginBottom: 8,
    },
    decorativeCircle1: {
        position: "absolute",
        top: 50,
        left: 50,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: "#F0E6E6",
    },
    decorativeCircle2: {
        position: "absolute",
        top: "40%",
        right: "20%",
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "#E8D5D9",
    },
    decorativeCircle3: {
        position: "absolute",
        bottom: 100,
        left: 80,
        width: 40,
        height: 40,
        backgroundColor: "#E8D5D9",
        borderRadius: 20,
        opacity: 0.5,
    },
    decorativeCircleBig: {
        position: "absolute",
        bottom: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#E6F0E6",
        opacity: 0.5,
        zIndex: 1,
    },
    formSection: {
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
        backgroundColor: "#FFFCF9",
    },
    formContent: {
        width: "100%",
        maxWidth: 400,
    },
    alreadySellerContainer: {
        alignItems: "center",
        textAlign: "center",
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: "#888",
        marginBottom: 30,
        textAlign: "center",
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: "#555",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#333",
        marginBottom: 4,
    },
    inputError: {
        borderColor: "#e74c3c",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    charCount: {
        fontSize: 12,
        color: "#999",
        textAlign: "right",
        marginBottom: 12,
    },
    fieldError: {
        color: "#e74c3c",
        fontSize: 12,
        marginBottom: 8,
    },
    errorText: {
        color: "#e74c3c",
        marginBottom: 16,
        padding: 12,
        backgroundColor: "#fdf0ef",
        borderRadius: 8,
        textAlign: "center",
    },
    termsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 16,
        gap: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: "#ddd",
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    checkboxChecked: {
        backgroundColor: "#C88EA7",
        borderColor: "#C88EA7",
    },
    checkmark: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    termsText: {
        flex: 1,
        color: "#555",
        fontSize: 14,
    },
    termsLink: {
        color: "#B36979",
        textDecorationLine: "underline",
    },
    submitButton: {
        backgroundColor: "#C88EA7",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#C88EA7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    submitButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.99 }],
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    backLink: {
        marginTop: 20,
        alignItems: "center",
    },
    backLinkText: {
        color: "#888",
        fontSize: 14,
    },
});
