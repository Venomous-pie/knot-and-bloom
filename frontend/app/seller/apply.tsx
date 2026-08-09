import { useAuth } from "@/contexts/AuthContext";
import { sellerAPI } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDraft } from "@/hooks/useDraft";
import { Link, RelativePathString, useRouter } from "expo-router";
import { categoryTitles } from "@/constants/categories";
import React, { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { theme } from '@/constants/theme';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import ImageUploader from '@/components/seller/ImageUploader';
import Button from '@/components/ui/Button';

export default function SellerApplyPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const scrollViewRef = useRef<ScrollView>(null);
    const isSubmittingRef = useRef(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    // Form State
    const [shopName, setShopName] = useState("");
    const [description, setDescription] = useState("");
    const [businessType, setBusinessType] = useState("Individual");
    const [productCategories, setProductCategories] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState("");
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);
    const [isHandmade, setIsHandmade] = useState(false);
    const [hasPriorExperience, setHasPriorExperience] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState(""); // Add email state
    const [socialLink, setSocialLink] = useState("");
    const [sampleItems, setSampleItems] = useState<{ uri: string, isUrl?: boolean }[]>([]);
    const [salesChannels, setSalesChannels] = useState<string[]>([]);
    const [monthlyOrders, setMonthlyOrders] = useState("");
    const [isMonthlyOrdersOpen, setIsMonthlyOrdersOpen] = useState(false);

    // KYC Fields
    const [legalName, setLegalName] = useState("");
    const [businessAddress, setBusinessAddress] = useState("");
    const [portfolioLink, setPortfolioLink] = useState("");
    const [idType, setIdType] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [idPhotos, setIdPhotos] = useState<{ uri: string, isUrl?: boolean }[]>([]);
    const [isIdTypeOpen, setIsIdTypeOpen] = useState(false);

    // ID format rules per type
    const ID_FORMATS: Record<string, { placeholder: string; maxLength: number; hint: string; regex: RegExp; keyboardType: any; autoCapitalize: any }> = {
        "National ID": { placeholder: "e.g. 1234567891015678", maxLength: 19, hint: "16 digits", regex: /^\d{16}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "Driver's License": { placeholder: "e.g. A0123456789", maxLength: 13, hint: "1 letter followed by 8 digits", regex: /^[A-Z]\d{8}$/, keyboardType: 'default', autoCapitalize: 'characters' },
        "Passport": { placeholder: "e.g. P1234567A", maxLength: 9, hint: "9 characters (letter + 7 digits + letter)", regex: /^[A-Z]\d{7}[A-Z]$/, keyboardType: 'default', autoCapitalize: 'characters' },
        "Postal ID": { placeholder: "e.g. 123456789012", maxLength: 15, hint: "12 digits", regex: /^\d{12}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "SSS": { placeholder: "e.g. 1234567890", maxLength: 15, hint: "10 digits", regex: /^\d{10}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "PhilHealth": { placeholder: "e.g. 123456789012", maxLength: 16, hint: "12 digits", regex: /^\d{12}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "TIN": { placeholder: "e.g. 123456789000", maxLength: 15, hint: "9 to 12 digits", regex: /^\d{9,12}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "GSIS": { placeholder: "e.g. 12345678901", maxLength: 15, hint: "11 digits", regex: /^\d{11}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "Voter's ID": { placeholder: "e.g. 1234567890123", maxLength: 20, hint: "Voter ID number as printed on card", regex: /^[A-Z0-9]{6,20}$/, keyboardType: 'default', autoCapitalize: 'characters' },
        "PRC ID": { placeholder: "e.g. 1234567", maxLength: 10, hint: "7 digits", regex: /^\d{7}$/, keyboardType: 'numeric', autoCapitalize: 'none' },
        "School ID": { placeholder: "Your school ID number", maxLength: 20, hint: "As printed on your school ID", regex: /^[A-Z0-9]{4,20}$/i, keyboardType: 'default', autoCapitalize: 'characters' },
        "Other": { placeholder: "Your ID number", maxLength: 30, hint: "Enter your ID number as printed", regex: /^.{4,30}$/, keyboardType: 'default', autoCapitalize: 'none' },
    };

    const currentIdFormat = idType ? ID_FORMATS[idType] : null;
    const handleSetIdType = (type: string) => { setIdType(type); setIdNumber(""); setIsIdTypeOpen(false); };


    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleAddCategoryInput = (input: string) => {
        if (!input.trim()) return;
        const parts = input.split(',').map(p => p.trim()).filter(Boolean);
        const ALL_CATEGORIES = Object.values(categoryTitles);

        setProductCategories(prev => {
            const combined = [...prev];
            parts.forEach(part => {
                const cased = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                const exactMatch = ALL_CATEGORIES.find(c => c.toLowerCase() === cased.toLowerCase());
                const finalCat = exactMatch || cased;

                if (!combined.some(c => c.toLowerCase() === finalCat.toLowerCase())) {
                    combined.push(finalCat);
                }
            });
            return combined;
        });
        setCategorySearch("");
    };

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const draftData = {
        currentStep, shopName, description, businessType, productCategories,
        isHandmade, hasPriorExperience, phoneNumber, email, socialLink,
        legalName, businessAddress, portfolioLink, idType, idNumber, idPhotos, termsAccepted,
        sampleItems, salesChannels, monthlyOrders
    };

    const { clearDraft } = useDraft({
        key: user ? `seller_application_draft_${user.uid}` : 'seller_application_draft',
        data: draftData,
        enabled: !!user,
        onLoad: (draft: any) => {
            if (draft.currentStep) setCurrentStep(draft.currentStep);
            if (draft.shopName) setShopName(draft.shopName);
            if (draft.description) setDescription(draft.description);
            if (draft.businessType) setBusinessType(draft.businessType);
            if (draft.productCategories) setProductCategories(draft.productCategories);
            if (draft.isHandmade !== undefined) setIsHandmade(draft.isHandmade);
            if (draft.hasPriorExperience !== undefined) setHasPriorExperience(draft.hasPriorExperience);
            if (draft.phoneNumber) setPhoneNumber(draft.phoneNumber);
            if (draft.email) setEmail(draft.email);
            if (draft.socialLink) setSocialLink(draft.socialLink);
            if (draft.legalName) setLegalName(draft.legalName);
            if (draft.businessAddress) setBusinessAddress(draft.businessAddress);
            if (draft.portfolioLink) setPortfolioLink(draft.portfolioLink);
            if (draft.idType) setIdType(draft.idType);
            if (draft.idNumber) setIdNumber(draft.idNumber);
            if (draft.idPhotos) setIdPhotos(draft.idPhotos);
            if (draft.termsAccepted !== undefined) setTermsAccepted(draft.termsAccepted);
            if (draft.sampleItems) setSampleItems(draft.sampleItems);
            if (draft.salesChannels) setSalesChannels(draft.salesChannels);
            if (draft.monthlyOrders) setMonthlyOrders(draft.monthlyOrders);
        },
    });

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
    const isAlreadySeller = user?.sellerProfile?.uid || user?.role === "SELLER";


    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        const trimmedName = shopName.trim();
        if (!trimmedName) newErrors.shopName = "Shop name is required";
        else if (trimmedName.length < 3) newErrors.shopName = "Shop name must be at least 3 characters";
        else if (trimmedName.length > 50) newErrors.shopName = "Shop name must be 50 characters or less";

        if (description.length > 500) newErrors.description = "Description must be 500 characters or less";

        if (productCategories.length === 0) newErrors.productCategories = "At least one category is required";

        if (sampleItems.length === 0) newErrors.sampleItems = "At least one sample item photo is required";

        if (!isHandmade) newErrors.isHandmade = "You must confirm that your items are handmade";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};

        const trimmedPhone = phoneNumber.trim();
        if (!trimmedPhone) {
            newErrors.phoneNumber = "Phone number is required";
        } else if (/[a-zA-Z]/.test(trimmedPhone)) {
            newErrors.phoneNumber = "Phone number must only contain numbers";
        } else if (trimmedPhone.replace(/[^0-9]/g, '').length < 10) {
            newErrors.phoneNumber = "Phone number must be at least 10 digits";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        const trimmedLegalName = legalName.trim();
        if (!trimmedLegalName) {
            newErrors.legalName = "Legal name is required.";
        } else if (trimmedLegalName.length < 2) {
            newErrors.legalName = "Legal name must be at least 2 characters.";
        }

        const trimmedAddress = businessAddress.trim();
        if (!trimmedAddress) {
            newErrors.businessAddress = "Full business address is required.";
        } else if (trimmedAddress.length < 5) {
            newErrors.businessAddress = "Please provide a complete address.";
        }

        const trimmedPortfolio = portfolioLink.trim();
        if (!trimmedPortfolio) {
            newErrors.portfolioLink = "Personal social media link is required.";
        } else if (trimmedPortfolio.length < 3) {
            newErrors.portfolioLink = "Please provide a valid link.";
        }

        if (!idType) {
            newErrors.idType = "ID Type is required.";
        }
        if (!idNumber.trim()) {
            newErrors.idNumber = "ID Number is required.";
        } else if (currentIdFormat && !currentIdFormat.regex.test(idNumber.replace(/[-\s]/g, ''))) {
            newErrors.idNumber = `Invalid format. Expected: ${currentIdFormat.hint}.`;
        }
        if (idPhotos.length === 0) {
            newErrors.idPhotos = "At least one ID photo (front) is required.";
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

    const isStep1Valid = shopName.trim().length >= 3 && shopName.trim().length <= 50 && description.length <= 500 && productCategories.length > 0 && sampleItems.length > 0 && isHandmade;

    const isStep2Valid =
        legalName.trim().length >= 2 &&
        businessAddress.trim().length >= 5 &&
        portfolioLink.trim().length >= 3 &&
        phoneNumber.trim() !== '' && !/[a-zA-Z]/.test(phoneNumber.trim()) && phoneNumber.trim().replace(/[^0-9]/g, '').length >= 10 &&
        email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        idType !== '' && (currentIdFormat ? currentIdFormat.regex.test(idNumber.replace(/[-\s]/g, '')) : idNumber.trim() !== '') && idPhotos.length > 0;

    const handleNext = () => {
        let isValid = false;
        if (currentStep === 1) isValid = validateStep1();
        if (currentStep === 2) isValid = validateStep2();

        if (isValid) {
            setCurrentStep(prev => prev + 1);
            setErrors({});
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
    };

    const handleSubmit = async () => {
        if (!validateStep3()) return;
        if (isSubmittingRef.current) return;

        isSubmittingRef.current = true;
        setLoading(true);
        try {
            await sellerAPI.onboard({
                name: shopName.trim(),
                description: description.trim() || undefined,
                businessType: businessType,
                productCategories: productCategories.length > 0 ? productCategories : undefined,
                isHandmade: isHandmade,
                hasPriorExperience: hasPriorExperience,
                sampleItems: sampleItems.map(i => i.uri),
                salesChannels: salesChannels,
                monthlyOrders: monthlyOrders || undefined,
                phone: phoneNumber.trim(),
                socialMediaLink: socialLink.trim() || undefined,
                email: email.trim(),
                legalName: legalName.trim(),
                businessAddress: businessAddress.trim(),
                portfolioLink: portfolioLink.trim() || undefined,
                idType: idType.trim() || undefined,
                idNumber: idNumber.trim() || undefined,
                idPhotos: idPhotos.length > 0 ? idPhotos.map(i => i.uri) : undefined,
                termsAccepted: termsAccepted,
            });

            // Success - refresh user context and redirect to application-submitted
            await clearDraft();
            await refreshUser();
            router.replace("/seller/application-submitted" as RelativePathString);
        } catch (error: any) {
            const status = error?.response?.status;
            const data = error?.response?.data;

            if (status === 409) {
                setErrors({ general: "You've already applied as a seller" });
            } else if (status === 400 && Array.isArray(data?.error)) {
                // Zod validation errors from backend
                const fieldErrors: Record<string, string> = {};
                data.error.forEach((issue: any) => {
                    const field = issue.path?.[0];
                    if (field) fieldErrors[field] = issue.message;
                });
                setErrors(fieldErrors);
            } else if (status === 429) {
                setErrors({ general: "Too many attempts. Please try again later." });
            } else {
                setErrors({ general: data?.error || "Something went wrong. Please try again." });
            }
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };



    const renderStep1 = () => (
        <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.stepTitle}>Shop Identity</Text>
            <Text style={styles.stepSubtitle}>Let's start with the basics of your shop.</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Shop Name *</Text>
                <TextInput
                    style={[styles.input, focusedField === 'shopName' && styles.inputFocused, errors.shopName && styles.inputError]}
                    value={shopName}
                    onChangeText={setShopName}
                    placeholder="e.g. My Crochet Corner"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    maxLength={50}
                    onFocus={() => setFocusedField('shopName')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.shopName && <Text style={styles.fieldError}>{errors.shopName}</Text>}
            </View>

            <View style={[styles.formGroup, { zIndex: 11 }]}>
                <Text style={styles.label}>Product Categories *</Text>

                {productCategories.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {productCategories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={styles.selectedPill}
                                onPress={() => setProductCategories(prev => prev.filter(c => c !== cat))}
                            >
                                <Text style={styles.selectedPillText}>{cat} ✕</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ position: 'relative' }}>
                    <TextInput
                        style={[styles.input, focusedField === 'categorySearch' && styles.inputFocused, errors.productCategories && styles.inputError]}
                        value={categorySearch}
                        onChangeText={(text) => {
                            if (text.includes(',')) {
                                handleAddCategoryInput(text);
                            } else {
                                setCategorySearch(text);
                                setIsCategoryDropdownOpen(true);
                            }
                        }}
                        placeholder="Search or select categories..."
                        placeholderTextColor={theme.colors.textLight}
                        onFocus={() => {
                            setFocusedField('categorySearch');
                            setIsCategoryDropdownOpen(true);
                        }}
                        onBlur={() => {
                            setFocusedField(null);
                            setIsCategoryDropdownOpen(false);
                        }}
                        onKeyPress={(e) => {
                            if (e.nativeEvent.key === 'Escape') {
                                setIsCategoryDropdownOpen(false);
                            }
                        }}
                        onSubmitEditing={() => {
                            handleAddCategoryInput(categorySearch);
                        }}
                    />
                    <Ionicons
                        name={isCategoryDropdownOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textLight}
                        style={{ position: 'absolute', right: 14, top: 14 }}
                    />

                    {isCategoryDropdownOpen && (
                        <View style={[styles.dropdownList, { maxHeight: 200, overflow: 'hidden', top: 50, zIndex: 100 }]}>
                            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
                                {(() => {
                                    const ALL_CATEGORIES = Object.values(categoryTitles);

                                    // 1. Filter out already selected ones so we don't show duplicates
                                    const unselectedCategories = ALL_CATEGORIES.filter(c => !productCategories.includes(c));

                                    // 2. Filter based on search text
                                    const filteredCategories = unselectedCategories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase().trim()));

                                    // 3. Handle custom categories (if search doesn't exactly match any existing ALL_CATEGORIES)
                                    const isCustomValid = categorySearch.trim().length > 0;
                                    const exactMatchExists = ALL_CATEGORIES.some(c => c.toLowerCase() === categorySearch.toLowerCase().trim());
                                    const showCustomAdd = isCustomValid && !exactMatchExists && !productCategories.some(c => c.toLowerCase() === categorySearch.toLowerCase().trim());

                                    const options = [...filteredCategories];

                                    if (options.length === 0 && !showCustomAdd) {
                                        return (
                                            <View style={styles.dropdownItem}>
                                                <Text style={{ color: theme.colors.textLight }}>No categories found</Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <>
                                            {showCustomAdd && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.dropdownItem,
                                                        { borderBottomWidth: options.length > 0 ? 1 : 0, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }
                                                    ]}
                                                    onPress={() => handleAddCategoryInput(categorySearch)}
                                                    {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
                                                >
                                                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                                                        + Add "{categorySearch.trim()}"
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            {options.map((opt, idx) => (
                                                <TouchableOpacity
                                                    key={opt}
                                                    style={[
                                                        styles.dropdownItem,
                                                        idx !== options.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                                                    ]}
                                                    onPress={() => handleAddCategoryInput(opt)}
                                                    {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
                                                >
                                                    <Text style={{ color: theme.colors.text }}>{opt}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </>
                                    );
                                })()}
                            </ScrollView>
                        </View>
                    )}
                </View>
                {errors.productCategories && <Text style={styles.fieldError}>{errors.productCategories}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Photo of 1-3 handmade items *</Text>
                <Text style={styles.sublabel}>Show us a few examples of your work.</Text>
                <ImageUploader
                    images={sampleItems}
                    onImagesChange={setSampleItems}
                    maxImages={3}
                    compact
                    hidePrimaryBadge
                />
                {errors.sampleItems && <Text style={styles.fieldError}>{errors.sampleItems}</Text>}
            </View>

            <Pressable
                style={styles.termsContainer}
                onPress={() => setIsHandmade(!isHandmade)}
            >
                <View style={[styles.checkbox, isHandmade && styles.checkboxChecked]}>
                    {isHandmade && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>I make these products by hand *</Text>
            </Pressable>
            {errors.isHandmade && <Text style={styles.fieldError}>{errors.isHandmade}</Text>}

            <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea, focusedField === 'description' && styles.inputFocused, errors.description && styles.inputError]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Tell us about what you make..."
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    onFocus={() => setFocusedField('description')}
                    onBlur={() => setFocusedField(null)}
                />
                <Text style={[styles.helperText, { textAlign: 'right' }]}>{description.length}/500</Text>
                {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
            </View>

            <View style={[styles.formGroup, { zIndex: 10 }]}>
                <Text style={styles.label}>Business Type</Text>
                <TouchableOpacity
                    style={styles.input}
                    onPress={() => setIsBusinessTypeOpen(!isBusinessTypeOpen)}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: theme.colors.text }}>{businessType}</Text>
                    <Ionicons
                        name={isBusinessTypeOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textLight}
                        style={{ position: 'absolute', right: 14, top: 14 }}
                    />
                </TouchableOpacity>
                {isBusinessTypeOpen && (
                    <View style={[styles.dropdownList, { top: 'auto', bottom: 55, zIndex: 999 }]}>
                        {["Individual", "Registered Business"].map((opt, idx) => (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.dropdownItem,
                                    idx === 0 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                                ]}
                                onPress={() => { setBusinessType(opt); setIsBusinessTypeOpen(false); }}
                            >
                                <Text style={{ color: theme.colors.text }}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <Pressable
                style={styles.termsContainer}
                onPress={() => setHasPriorExperience(!hasPriorExperience)}
            >
                <View style={[styles.checkbox, hasPriorExperience && styles.checkboxChecked]}>
                    {hasPriorExperience && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>I have prior experience selling online</Text>
            </Pressable>

            {hasPriorExperience && (
                <View style={styles.experienceSection}>
                    <View style={[styles.formGroup, { zIndex: 8, marginBottom: 0 }]}>
                        <Text style={styles.label}>Where do you currently sell?</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            {[
                                "Facebook", "Instagram", "Shopee", "Lazada", "TikTok Shop", "Own Website", "Other"
                            ].map(channel => {
                                const isSelected = salesChannels.includes(channel);
                                return (
                                    <TouchableOpacity
                                        key={channel}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: isSelected ? theme.colors.primary : theme.colors.subtle,
                                            borderWidth: 1,
                                            borderColor: isSelected ? theme.colors.primaryDark : theme.colors.border
                                        }}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSalesChannels(prev => prev.filter(c => c !== channel));
                                            } else {
                                                setSalesChannels(prev => [...prev, channel]);
                                            }
                                        }}
                                    >
                                        <Text style={{ color: isSelected ? 'white' : theme.colors.textSecondary, fontSize: 13, fontWeight: isSelected ? '600' : '400' }}>
                                            {channel}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={[styles.formGroup, { zIndex: 10, marginBottom: 0 }]}>
                        <Text style={styles.label}>Approximate monthly orders</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => setIsMonthlyOrdersOpen(!isMonthlyOrdersOpen)}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: monthlyOrders ? theme.colors.text : theme.colors.textLight }}>
                                {monthlyOrders || "Select Range"}
                            </Text>
                            <Ionicons
                                name={isMonthlyOrdersOpen ? "chevron-up" : "chevron-down"}
                                size={20}
                                color={theme.colors.textLight}
                                style={{ position: 'absolute', right: 14, top: 14 }}
                            />
                        </TouchableOpacity>
                        {isMonthlyOrdersOpen && (
                            <View style={[styles.dropdownList, { top: 'auto', bottom: 55, zIndex: 999 }]}>
                                {["1-5", "6-20", "21-50", "50+"].map((opt, idx) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.dropdownItem,
                                            idx !== 3 && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }
                                        ]}
                                        onPress={() => { setMonthlyOrders(opt); setIsMonthlyOrdersOpen(false); }}
                                    >
                                        <Text style={{ color: theme.colors.text }}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={[styles.formGroup, { marginBottom: 0 }]}>
                        <Text style={styles.label}>Link to existing shop/page</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'socialLink' && styles.inputFocused]}
                            value={socialLink}
                            onChangeText={setSocialLink}
                            placeholder="e.g. instagram.com/myshop"
                            placeholderTextColor={theme.colors.textLight}
                            selectionColor={theme.colors.primary}
                            autoCapitalize="none"
                            onFocus={() => setFocusedField('socialLink')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>
                </View>
            )}

        </Animated.View>
    );

    const renderStep2 = () => (
        <Animated.View entering={FadeIn.duration(400)} style={{ zIndex: 10 }}>
            <Text style={styles.stepTitle}>Identity & Contact Details</Text>
            <Text style={styles.stepSubtitle}>Help us verify your identity and business.</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Full Legal Name *</Text>
                <TextInput
                    style={[styles.input, focusedField === 'legalName' && styles.inputFocused, errors.legalName && styles.inputError]}
                    value={legalName}
                    onChangeText={setLegalName}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    onFocus={() => setFocusedField('legalName')}
                    onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.helperText}>Used for verification and payouts. Not visible to customers.</Text>
                {errors.legalName && <Text style={styles.fieldError}>{errors.legalName}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Full Business / Pickup Address *</Text>
                <TextInput
                    style={[styles.input, styles.textArea, focusedField === 'businessAddress' && styles.inputFocused, errors.businessAddress && styles.inputError]}
                    value={businessAddress}
                    onChangeText={setBusinessAddress}
                    placeholder="e.g. 123 Craft St, Arts District, City, Province, 1000"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    multiline
                    numberOfLines={3}
                    onFocus={() => setFocusedField('businessAddress')}
                    onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.helperText}>Used for courier pickup and admin correspondence.</Text>
                {errors.businessAddress && <Text style={styles.fieldError}>{errors.businessAddress}</Text>}
            </View>

            {/* Email Field */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                    style={[
                        styles.input,
                        focusedField === 'email' && styles.inputFocused,
                        errors.email && styles.inputError,
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="e.g. yourname@example.com"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
                {!errors.email && user?.email && email === user.email && (
                    <Text style={styles.helperText}>Pre-filled from your account.</Text>
                )}
            </View>

            {/* Phone Field */}
            <View style={styles.formGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={[styles.input, focusedField === 'phoneNumber' && styles.inputFocused, errors.phoneNumber && styles.inputError]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="e.g. 0912 345 6789"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField('phoneNumber')}
                    onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.helperText}>Used for admin contact and logistics notifications.</Text>
                {errors.phoneNumber && <Text style={styles.fieldError}>{errors.phoneNumber}</Text>}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Personal Social Media Link *</Text>
                <TextInput
                    style={[styles.input, focusedField === 'portfolioLink' && styles.inputFocused, errors.portfolioLink && styles.inputError]}
                    value={portfolioLink}
                    onChangeText={setPortfolioLink}
                    placeholder="e.g. facebook.com/yourname"
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('portfolioLink')}
                    onBlur={() => setFocusedField(null)}
                />
                <Text style={styles.helperText}>Provide a link to your personal profile for verification purposes and faster approval.</Text>
                {errors.portfolioLink && <Text style={styles.fieldError}>{errors.portfolioLink}</Text>}
            </View>

            <View style={styles.divider} />
            <View style={[styles.formGroup, { zIndex: 9, marginTop: 16 }]}>
                <Text style={styles.label}>ID Type *</Text>
                <TouchableOpacity
                    style={[styles.input, errors.idType && styles.inputError]}
                    onPress={() => setIsIdTypeOpen(!isIdTypeOpen)}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: idType ? theme.colors.text : theme.colors.textLight }}>
                        {idType || "Select ID Type"}
                    </Text>
                    <Ionicons
                        name={isIdTypeOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textLight}
                        style={{ position: 'absolute', right: 14, top: 14 }}
                    />
                </TouchableOpacity>
                {isIdTypeOpen && (
                    <View style={styles.dropdownItemIdType}>
                        {["National ID", "Driver's License", "Passport", "Postal ID", "SSS", "PhilHealth", "TIN", "GSIS", "Voter's ID", "PRC ID", "School ID", "Other"].map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.dropdownItem, { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
                                onPress={() => handleSetIdType(opt)}
                            >
                                <Text style={{ color: theme.colors.text }}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
                {errors.idType && <Text style={styles.fieldError}>{errors.idType}</Text>}
            </View>

            <View style={[styles.formGroup, { zIndex: 1 }]}>
                <Text style={styles.label}>ID Photos (Front & Back) *</Text>
                <Text style={styles.sublabel}>Please upload clear photos of your ID for automated verification.</Text>
                <ImageUploader
                    images={idPhotos}
                    onImagesChange={setIdPhotos}
                    maxImages={2}
                    compact
                    hidePrimaryBadge
                />
                {errors.idPhotos && <Text style={styles.fieldError}>{errors.idPhotos}</Text>}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                    <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>ID Number *</Text>
                </View>
                {currentIdFormat && (
                    <Text style={{ fontSize: 12, color: theme.colors.textLight, fontFamily: 'Quicksand', marginBottom: 6 }}>
                        {currentIdFormat.hint}
                    </Text>
                )}
                <TextInput
                    style={[styles.input, focusedField === 'idNumber' && styles.inputFocused, errors.idNumber && styles.inputError]}
                    value={idNumber}
                    onChangeText={(text) => {
                        const upper = currentIdFormat?.autoCapitalize === 'characters' ? text.toUpperCase() : text;
                        if (currentIdFormat && upper.length > currentIdFormat.maxLength) return;
                        setIdNumber(upper);
                    }}
                    placeholder={currentIdFormat?.placeholder ?? "Select an ID type first"}
                    placeholderTextColor={theme.colors.textLight}
                    selectionColor={theme.colors.primary}
                    keyboardType={currentIdFormat?.keyboardType ?? 'default'}
                    autoCapitalize={currentIdFormat?.autoCapitalize ?? 'none'}
                    editable={!!idType}
                    onFocus={() => setFocusedField('idNumber')}
                    onBlur={() => setFocusedField(null)}
                />
                {errors.idNumber && <Text style={styles.fieldError}>{errors.idNumber}</Text>}
            </View>

        </Animated.View>
    );

    const renderStep3 = () => (
        <Animated.View entering={FadeIn.duration(400)}>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepSubtitle}>Please review your application details.</Text>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Shop Name:</Text>
                <Text style={styles.reviewValue}>{shopName}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Legal Name:</Text>
                <Text style={styles.reviewValue}>{legalName}</Text>
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
                <Text style={styles.reviewLabel}>Existing Shop Link:</Text>
                <Text style={styles.reviewValue}>{socialLink || "N/A"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Personal Social Media:</Text>
                <Text style={styles.reviewValue}>{portfolioLink}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>ID Verification:</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.reviewValue}>
                        {idType || "Not selected"} {idNumber ? `— ${idNumber.length > 6 ? `${'•'.repeat(idNumber.length - 4)}${idNumber.slice(-4)}` : '••••'}` : ''}
                    </Text>
                    <Text style={[styles.reviewValue, { color: theme.colors.textLight, fontSize: 13, marginTop: 2 }]}>
                        {idPhotos.length} photo{idPhotos.length !== 1 ? 's' : ''} uploaded
                    </Text>
                </View>
            </View>


            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Business Type:</Text>
                <Text style={styles.reviewValue}>{businessType}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Categories:</Text>
                <Text style={styles.reviewValue}>{productCategories.length > 0 ? productCategories.join(", ") : "N/A"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Handmade:</Text>
                <Text style={styles.reviewValue}>{isHandmade ? "Yes" : "No"}</Text>
            </View>

            <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Prior Experience:</Text>
                <Text style={styles.reviewValue}>{hasPriorExperience ? "Yes" : "No"}</Text>
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
                    <Link href="/terms/seller" asChild>
                        <Text style={styles.termsLink}>Seller Terms and Conditions</Text>
                    </Link>
                </Text>
            </Pressable>
            {errors.terms && <Text style={styles.fieldError}>{errors.terms}</Text>}
            {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
        </Animated.View>
    );

    if (authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={theme.colors.primaryLight} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {!(isAlreadySeller && user?.sellerProfile?.status !== "REJECTED") && (
                    <View style={{ paddingTop: 20, paddingBottom: 10, backgroundColor: theme.colors.surface, zIndex: 100, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                        <View style={[styles.stepIndicatorContainer, { marginBottom: 0, maxWidth: 600, alignSelf: 'center', paddingHorizontal: 24 }]}>
                            {[{ num: 1, label: 'Shop Info' }, { num: 2, label: 'Identity' }, { num: 3, label: 'Review' }].map(({ num: step, label }) => (
                                <React.Fragment key={step}>
                                    <View style={{ alignItems: 'center' }}>
                                        <View style={[
                                            styles.stepCircle,
                                            currentStep >= step && styles.stepCircleActive
                                        ]}>
                                            {currentStep > step ? (
                                                <Ionicons name="checkmark" size={16} color="white" />
                                            ) : (
                                                <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>
                                                    {step}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={{ fontSize: 10, color: currentStep >= step ? theme.colors.primary : theme.colors.textLight, marginTop: 4, fontWeight: currentStep >= step ? '600' : '400' }}>
                                            {label}
                                        </Text>
                                    </View>
                                    {step < 3 && (
                                        <View style={[
                                            styles.stepLine,
                                            currentStep > step && styles.stepLineActive,
                                            { marginBottom: 16 }
                                        ]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>
                )}
                <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
                    <View style={[styles.contentContainer, styles.column]}>
                        {/* Centered Wizard Form */}
                        <View style={[styles.formSection, { width: "100%" }]}>
                            <View style={styles.formContent}>
                                {isAlreadySeller && user?.sellerProfile?.status !== "REJECTED" ? (
                                    <View style={styles.alreadySellerContainer}>
                                        <Text style={{ fontSize: 48, marginBottom: 20 }}>✅</Text>
                                        <Text style={styles.welcomeTitle}>
                                            {user?.sellerProfile?.status === "PENDING" ? "Application Pending" : "Already a Seller!"}
                                        </Text>
                                        <Text style={styles.welcomeSubtitle}>
                                            {user?.sellerProfile?.status === "PENDING"
                                                ? "Your application is pending review. We'll notify you once approved."
                                                : "You're already a seller! Head to your dashboard to manage your shop."}
                                        </Text>
                                        <Button
                                            title={user?.sellerProfile?.status === "PENDING" ? "View Application Status" : "Go to Seller Dashboard →"}
                                            onPress={() => router.push(
                                                user?.sellerProfile?.status === "PENDING"
                                                    ? "/seller/application-status" as RelativePathString
                                                    : "/seller-dashboard" as RelativePathString
                                            )}
                                        />
                                    </View>
                                ) : (
                                    <View>
                                        {currentStep === 1 && renderStep1()}
                                        {currentStep === 2 && renderStep2()}
                                        {currentStep === 3 && renderStep3()}

                                        {/* Navigation Buttons */}
                                        <View style={styles.navigationButtons}>
                                            <Button
                                                title="Exit"
                                                variant="outline"
                                                onPress={() => router.replace("/" as RelativePathString)}
                                                disabled={loading}
                                                style={{ flex: 1, height: 'auto', paddingVertical: 16, backgroundColor: theme.colors.subtle, borderWidth: 0 }}
                                                textStyle={{ color: theme.colors.textSecondary }}
                                            />

                                            {currentStep > 1 && (
                                                <Button
                                                    title="Back"
                                                    variant="outline"
                                                    onPress={handleBack}
                                                    disabled={loading}
                                                    style={{ flex: 1, height: 'auto', paddingVertical: 16, backgroundColor: theme.colors.subtle, borderWidth: 0 }}
                                                    textStyle={{ color: theme.colors.textSecondary }}
                                                />
                                            )}

                                            {currentStep < totalSteps ? (
                                                <Button
                                                    title="Next Step →"
                                                    variant="primary"
                                                    onPress={handleNext}
                                                    style={{ flex: currentStep === 1 ? 1 : 2, height: 'auto', paddingVertical: 16 }}
                                                />
                                            ) : (
                                                <Button
                                                    title="Submit Application"
                                                    variant="primary"
                                                    onPress={handleSubmit}
                                                    disabled={loading}
                                                    loading={loading}
                                                    style={{ flex: 2, height: 'auto', paddingVertical: 16 }}
                                                />
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
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
    brandingImage: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    brandingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(143, 84, 97, 0.65)",
    },
    brandingTextContainer: {
        position: "absolute",
        bottom: 60,
        left: 40,
        right: 40,
        zIndex: 3,
    },
    brandingTagline: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 12,
        textShadowColor: "rgba(0, 0, 0, 0.5)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    brandingSubtagline: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 24,
        marginBottom: 16,
    },
    brandingHighlight: {
        fontSize: 14,
        color: theme.colors.primaryLight,
        fontWeight: "600",
        fontStyle: "italic",
    },
    brandEmoji: {
        fontSize: 40,
        marginBottom: 10,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 5,
        fontFamily: Platform.OS === "web" ? "serif" : "System",
    },
    brandSubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: "center",
        maxWidth: 300,
        lineHeight: 24,
    },
    featuresList: {
        alignItems: "flex-start",
    },
    featureItem: {
        fontSize: 14,
        color: theme.colors.textLight,
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
        maxWidth: 600,
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
        color: theme.colors.text,
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 30,
        textAlign: "center",
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.text,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        color: theme.colors.textSecondary,
    },
    sublabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    helperText: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginTop: 6,
    },
    experienceSection: {
        marginTop: 8,
        padding: 16,
        backgroundColor: theme.colors.subtle,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        outlineStyle: "none" as any,
        ...theme.shadows.sm,
        shadowOpacity: 0.03,
    },
    inputFocused: {
        borderColor: theme.colors.primary,
        backgroundColor: "white",
        ...theme.shadows.sm,
        shadowOpacity: 0.08,
    },
    inputError: {
        borderColor: "#e74c3c",
    },
    dropdownList: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        marginTop: 4,
        backgroundColor: theme.colors.surface,
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        ...theme.shadows.md,
        overflow: 'hidden',
    },
    dropdownItemIdType: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        marginTop: 4,
        backgroundColor: theme.colors.surface,
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        ...theme.shadows.md,
        maxHeight: 220,
        overflow: 'hidden',
    },
    dropdownItem: {
        padding: 14,
        backgroundColor: theme.colors.surface,
    },
    selectedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.primary,
    },
    selectedPillText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
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
        backgroundColor: theme.colors.subtle,
        marginBottom: 8,
    },
    changeImageButton: {
        padding: 10,
        backgroundColor: theme.colors.subtle,
        borderRadius: 8,
        alignItems: 'center',
    },
    changeImageButtonText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'solid',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.subtle,
        ...theme.shadows.sm,
        shadowOpacity: 0.04,
    },
    uploadButtonText: {
        marginTop: 8,
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    // Review Styles
    reviewSection: {
        marginBottom: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingBottom: 8,
    },
    reviewLabel: {
        fontWeight: "600",
        color: theme.colors.textSecondary,
        width: "40%",
    },
    reviewValue: {
        color: theme.colors.text,
        flex: 1,
        textAlign: "right",
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
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
        backgroundColor: theme.colors.subtle,
        flex: 1,
        alignItems: "center",
    },
    backButtonText: {
        color: theme.colors.textSecondary,
        fontWeight: "600",
    },
    nextButton: {
        backgroundColor: theme.colors.primaryDark,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 2,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    nextButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
    fullWidthButton: {
        flex: 1,
    },
    nextButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    submitButton: {
        backgroundColor: theme.colors.primaryDark,
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        flex: 2, // Larger than back button
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    submitButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.99 }],
    },
    submitButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
    submitButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
    // Step Indicator
    stepIndicatorContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 30,
        width: "100%",
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    stepCircleActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: "bold",
        color: theme.colors.textLight,
    },
    stepNumberActive: {
        color: "white",
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.border,
        marginHorizontal: 8,
    },
    stepLineActive: {
        backgroundColor: theme.colors.primary,
    },
    // Terms
    termsContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8,
        gap: 10,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.colors.surface,
    },
    checkboxChecked: {
        backgroundColor: theme.colors.primaryDark,
        borderColor: theme.colors.primaryLight,
    },
    checkmark: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    termsText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    termsLink: {
        color: theme.colors.primary,
        textDecorationLine: "underline",
    },
});
