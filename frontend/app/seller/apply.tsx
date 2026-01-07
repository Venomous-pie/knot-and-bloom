import { useAuth } from "@/app/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RelativePathString, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
    KeyboardAvoidingView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { uploadToImageKit } from '@/lib/imagekit';
import ImageCropperModal from '@/components/admin/ImageCropperModal';
import { Ionicons } from "@expo/vector-icons";

export default function SellerApplyPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    // Form State
    const [shopName, setShopName] = useState("");
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [bannerUrl, setBannerUrl] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState(""); // Add email state
    const [socialLink, setSocialLink] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Image Upload State
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageUri, setCropImageUri] = useState<string | null>(null);
    const [cropImageType, setCropImageType] = useState<'logo' | 'banner'>('logo');
    const [uploadingImage, setUploadingImage] = useState<'logo' | 'banner' | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/auth/login" as RelativePathString);
        }
    }, [user, authLoading]);

    // Pre-fill contact details if available
    useEffect(() => {
        if (user) {
            if (user.phone) setPhoneNumber(user.phone);
            if (user.email) setEmail(user.email);
        }
    }, [user]);

    // Check if already a seller
    const isAlreadySeller = user?.sellerId || user?.role === "SELLER";

    const handlePickImage = async (type: 'logo' | 'banner') => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('Please grant photo library access to upload images.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setCropImageUri(result.assets[0].uri);
                setCropImageType(type);
                setShowCropper(true);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Failed to pick image. Please try again.');
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        setShowCropper(false);
        setUploadingImage(cropImageType);

        try {
            const uploadResult = await uploadToImageKit({ uri: croppedUri });

            if (cropImageType === 'logo') {
                setLogoUrl(uploadResult.url);
            } else {
                setBannerUrl(uploadResult.url);
            }

            setCropImageUri(null);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Could not upload image. Please try again.');
        } finally {
            setUploadingImage(null);
        }
    };

    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        const trimmedName = shopName.trim();
        if (!trimmedName) newErrors.shopName = "Shop name is required";
        else if (trimmedName.length < 3) newErrors.shopName = "Shop name must be at least 3 characters";
        else if (trimmedName.length > 50) newErrors.shopName = "Shop name must be 50 characters or less";

        if (description.length > 500) newErrors.description = "Description must be 500 characters or less";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};
        if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors: Record<string, string> = {};
        if (!termsAccepted) newErrors.terms = "You must agree to the Seller Terms";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        let isValid = false;
        if (currentStep === 1) isValid = validateStep1();
        if (currentStep === 2) isValid = validateStep2();

        if (isValid) {
            setCurrentStep(prev => prev + 1);
            setErrors({});
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (!validateStep3()) return;

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
                        // New fields - send them even if backend might ignore them for now
                        contactNumber: phoneNumber.trim(),
                        socialMediaLink: socialLink.trim() || undefined,
                        email: email.trim(),
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

    const ImageUploadSection = ({
        type,
        imageUrl,
        onPress
    }: {
        type: 'logo' | 'banner';
        imageUrl: string;
        onPress: () => void;
    }) => {
        const isUploading = uploadingImage === type;
        const aspectRatio = type === 'logo' ? 1 : 16 / 9;
        const title = type === 'logo' ? 'Shop Logo' : 'Shop Banner';
        const subtitle = type === 'logo'
            ? 'Square image, recommended 400x400px'
            : 'Wide image, recommended 1600x900px';

        return (
            <View style={styles.imageUploadSection}>
                <Text style={styles.label}>{title}</Text>
                <Text style={styles.sublabel}>{subtitle} (Optional)</Text>

                {imageUrl ? (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={[
                                styles.imagePreview,
                                { aspectRatio }
                            ]}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            style={styles.changeImageButton}
                            onPress={onPress}
                            disabled={isUploading}
                        >
                            <Text style={styles.changeImageButtonText}>
                                {isUploading ? 'Uploading...' : 'Change Image'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={onPress}
                        disabled={isUploading}
                    >
                        {isUploading ? (
                            <ActivityIndicator color="#C88EA7" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={32} color="#666" />
                                <Text style={styles.uploadButtonText}>Upload {title}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderStep1 = () => (
        <View>
            <Text style={styles.stepTitle}>Shop Identity</Text>
            <Text style={styles.stepSubtitle}>Let's start with the basics of your shop.</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                    style={[styles.input, errors.shopName && styles.inputError]}
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="e.g. My Crochet Corner"
                    placeholderTextColor="#999"
                    maxLength={50}
                />
                {errors.shopName && <Text style={styles.fieldError}>{errors.shopName}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Tell us about what you make..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                />
                {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
            </View>

            <ImageUploadSection
                type="logo"
                imageUrl={logoUrl}
                onPress={() => handlePickImage('logo')}
            />

            <ImageUploadSection
                type="banner"
                imageUrl={bannerUrl}
                onPress={() => handlePickImage('banner')}
            />
        </View>
    );

    const renderStep2 = () => (
        <View>
            <Text style={styles.stepTitle}>Contact Details</Text>
            <Text style={styles.stepSubtitle}>How can we reach you?</Text>

            {/* Email Field */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                    style={[
                        styles.input,
                        errors.email && styles.inputError,
                        // If user has verified email, maybe style as read-only or just let them edit?
                        // User request implies just "add field", so editable is safer.
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="e.g. yourname@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
                {!errors.email && user?.email && (
                    <Text style={styles.helperText}>Pre-filled from your account.</Text>
                )}
            </View>

            {/* Phone Field */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="e.g. 0912 345 6789"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                />
                <Text style={styles.helperText}>Used for admin contact and logistics notifications.</Text>
                {errors.phoneNumber && <Text style={styles.fieldError}>{errors.phoneNumber}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Social Media Link (Optional)</Text>
                <TextInput
                    style={styles.input}
                    value={socialLink}
                    onChangeText={setSocialLink}
                    placeholder="e.g. facebook.com/myshop"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                />
                <Text style={styles.helperText}>Used to verify your existing presence.</Text>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
                <Text style={styles.infoBoxText}>
                    Note: You can add your pickup address and bank details later in your Seller Dashboard after approval.
                </Text>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepSubtitle}>Please review your application details.</Text>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Shop Name:</Text>
                <Text style={styles.reviewValue}>{shopName}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Description:</Text>
                <Text style={styles.reviewValue}>{description || "N/A"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Email:</Text>
                <Text style={styles.reviewValue}>{email}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Phone:</Text>
                <Text style={styles.reviewValue}>{phoneNumber}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Social Link:</Text>
                <Text style={styles.reviewValue}>{socialLink || "N/A"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Logo:</Text>
                <Text style={styles.reviewValue}>{logoUrl ? "Uploaded" : "Not Provided"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Banner:</Text>
                <Text style={styles.reviewValue}>{bannerUrl ? "Uploaded" : "Not Provided"}</Text>
            </View>

            <View style={styles.divider} />

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
            {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
        </View>
    );

    if (authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#C88EA7" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={[styles.contentContainer, isDesktop ? styles.row : styles.column]}>
                        {/* Left Side - Branding (Desktop Only or simplified on Mobile) */}
                        <View style={[styles.brandingSection, isDesktop ? { width: "50%" } : { width: "100%", paddingVertical: 20, minHeight: 150 }]}>
                            {/* Simplified Branding for space efficiency */}
                            <View style={styles.brandingContent}>
                                <Text style={styles.brandEmoji}>🏪</Text>
                                <Text style={styles.brandTitle}>Become a Seller</Text>
                                {!isDesktop && <Text style={styles.brandSubtitle}>Step {currentStep} of {totalSteps}</Text>}
                                {isDesktop && (
                                    <Text style={styles.brandSubtitle}>
                                        Join our community of artisans and share your creations.
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Right Side - Wizard Form */}
                        <View style={[styles.formSection, isDesktop ? { width: "50%" } : { width: "100%" }]}>
                            <View style={styles.formContent}>
                                {isAlreadySeller && user?.sellerStatus !== "REJECTED" ? (
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
                                        {/* Progress Indicator (Desktop mainly, or minimal on mobile) */}
                                        <View style={styles.progressContainer}>
                                            <View style={[styles.progressBar, { width: `${(currentStep / totalSteps) * 100}%` }]} />
                                        </View>

                                        {currentStep === 1 && renderStep1()}
                                        {currentStep === 2 && renderStep2()}
                                        {currentStep === 3 && renderStep3()}

                                        {/* Navigation Buttons */}
                                        <View style={styles.navigationButtons}>
                                            {currentStep > 1 && (
                                                <TouchableOpacity
                                                    style={styles.backButton}
                                                    onPress={handleBack}
                                                    disabled={loading}
                                                >
                                                    <Text style={styles.backButtonText}>Back</Text>
                                                </TouchableOpacity>
                                            )}

                                            {currentStep < totalSteps ? (
                                                <TouchableOpacity
                                                    style={[styles.nextButton, currentStep === 1 && styles.fullWidthButton]}
                                                    onPress={handleNext}
                                                >
                                                    <Text style={styles.nextButtonText}>Next Step →</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.submitButton,
                                                        (loading || !termsAccepted) && styles.submitButtonDisabled
                                                    ]}
                                                    onPress={handleSubmit}
                                                    disabled={loading || !termsAccepted}
                                                >
                                                    {loading ? (
                                                        <ActivityIndicator color="white" />
                                                    ) : (
                                                        <Text style={styles.submitButtonText}>Submit Application</Text>
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ImageCropperModal
                visible={showCropper}
                imageUri={cropImageUri}
                onCrop={handleCropComplete}
                onSkip={() => {
                    setShowCropper(false);
                    setCropImageUri(null);
                }}
                onCancel={() => {
                    setShowCropper(false);
                    setCropImageUri(null);
                }}
            />
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
        padding: 20,
    },
    brandingContent: {
        zIndex: 2,
        alignItems: "center",
    },
    brandEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    brandSubtitle: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
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
        padding: 24,
        backgroundColor: "#FFFCF9",
        flex: 1,
    },
    formContent: {
        width: "100%",
        maxWidth: 500,
        alignSelf: "center",
    },
    alreadySellerContainer: {
        alignItems: "center",
        textAlign: "center",
        padding: 40,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: "#888",
        marginBottom: 30,
        textAlign: "center",
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: "#555",
    },
    sublabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 12,
        color: "#888",
        marginTop: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#fff",
        color: "#333",
    },
    inputError: {
        borderColor: "#e74c3c",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    fieldError: {
        color: "#e74c3c",
        fontSize: 12,
        marginTop: 4,
    },
    errorText: {
        color: "#e74c3c",
        marginTop: 16,
        padding: 12,
        backgroundColor: "#fdf0ef",
        borderRadius: 8,
        textAlign: "center",
    },
    infoBox: {
        flexDirection: "row",
        backgroundColor: "#E6F3FF",
        padding: 16,
        borderRadius: 8,
        gap: 12,
        marginTop: 10,
        alignItems: "flex-start",
    },
    infoBoxText: {
        flex: 1,
        color: "#0066CC",
        fontSize: 13,
        lineHeight: 18,
    },
    // Image Upload Styles
    imageUploadSection: {
        marginBottom: 20,
    },
    imagePreviewContainer: {
        width: '100%',
    },
    imagePreview: {
        width: '100%',
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginBottom: 8,
    },
    changeImageButton: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        alignItems: 'center',
    },
    changeImageButtonText: {
        color: '#B36979',
        fontWeight: '600',
    },
    uploadButton: {
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        borderRadius: 8,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
    },
    uploadButtonText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
    // Review Styles
    reviewSection: {
        marginBottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        paddingBottom: 8,
    },
    reviewLabel: {
        fontWeight: "600",
        color: "#555",
        width: "40%",
    },
    reviewValue: {
        color: "#333",
        flex: 1,
        textAlign: "right",
    },
    divider: {
        height: 1,
        backgroundColor: "#ddd",
        marginVertical: 20,
    },
    // Navigation & Buttons
    navigationButtons: {
        flexDirection: "row",
        marginTop: 30,
        gap: 12,
    },
    backButton: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: "#f0f0f0",
        flex: 1,
        alignItems: "center",
    },
    backButtonText: {
        color: "#666",
        fontWeight: "600",
    },
    nextButton: {
        backgroundColor: "#333", // Darker for high contrast
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    fullWidthButton: {
        flex: 1,
    },
    nextButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    submitButton: {
        backgroundColor: "#B36979",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 2, // Larger than back button
        shadowColor: "#B36979",
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
        fontWeight: "bold",
        fontSize: 16,
    },
    // Progress Bar
    progressContainer: {
        height: 4,
        backgroundColor: "#eee",
        borderRadius: 2,
        marginBottom: 30,
        width: "100%",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#B36979",
        borderRadius: 2,
    },
    // Terms
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
});
