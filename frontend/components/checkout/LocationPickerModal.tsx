import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, Pressable, Modal, StyleSheet, TextInput, ActivityIndicator, SectionList, ScrollView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { locationAPI } from '@/api/api';

export interface LocationSelection {
    region: string;
    province: string;
    city: string;
    barangay: string;
}

interface LocationPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (location: LocationSelection) => void;
    initialValue?: Partial<LocationSelection>;
}

type Step = 'region' | 'province' | 'city' | 'barangay';

interface LocationOption {
    code: string;
    name: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
    visible, onClose, onConfirm, initialValue
}) => {
    const [currentStep, setCurrentStep] = useState<Step>('region');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Data state
    const [regions, setRegions] = useState<LocationOption[]>([]);
    const [provinces, setProvinces] = useState<LocationOption[]>([]);
    const [cities, setCities] = useState<LocationOption[]>([]);
    const [barangays, setBarangays] = useState<LocationOption[]>([]);

    // Selection state
    const [selectedRegion, setSelectedRegion] = useState<LocationOption | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<LocationOption | null>(null);
    const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
    const [selectedBarangay, setSelectedBarangay] = useState<LocationOption | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) {
            loadRegions();
            resetSelection();
        }
    }, [visible]);

    const resetSelection = () => {
        setCurrentStep('region');
        setSelectedRegion(null);
        setSelectedProvince(null);
        setSelectedCity(null);
        setSelectedBarangay(null);
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setSearchQuery('');
    };

    const loadRegions = async () => {
        setIsLoading(true);
        try {
            const response = await locationAPI.getRegions();
            setRegions(response.data);
        } catch (error) {
            console.error('Failed to load regions', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadProvinces = async (regCode: string) => {
        setIsLoading(true);
        try {
            const response = await locationAPI.getProvinces(regCode);
            setProvinces(response.data);
        } catch (error) {
            console.error('Failed to load provinces', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCities = async (provCode: string) => {
        setIsLoading(true);
        try {
            const response = await locationAPI.getCities(provCode);
            setCities(response.data);
        } catch (error) {
            console.error('Failed to load cities', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadBarangays = async (citymunCode: string) => {
        setIsLoading(true);
        try {
            const response = await locationAPI.getBarangays(citymunCode);
            setBarangays(response.data);
        } catch (error) {
            console.error('Failed to load barangays', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCurrentOptions = (): LocationOption[] => {
        switch (currentStep) {
            case 'region': return regions;
            case 'province': return provinces;
            case 'city': return cities;
            case 'barangay': return barangays;
            default: return [];
        }
    };

    const filteredOptions = getCurrentOptions().filter(opt =>
        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (option: LocationOption) => {
        if (currentStep === 'region') {
            setSelectedRegion(option);
            setSelectedProvince(null);
            setSelectedCity(null);
            setSelectedBarangay(null);
            loadProvinces(option.code);
            setCurrentStep('province');
        } else if (currentStep === 'province') {
            setSelectedProvince(option);
            setSelectedCity(null);
            setSelectedBarangay(null);
            loadCities(option.code);
            setCurrentStep('city');
        } else if (currentStep === 'city') {
            setSelectedCity(option);
            setSelectedBarangay(null);
            loadBarangays(option.code);
            setCurrentStep('barangay');
        } else {
            setSelectedBarangay(option);
        }
        setSearchQuery('');
        
        // Scroll to end of breadcrumbs
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleBack = () => {
        setSearchQuery('');
        if (currentStep === 'barangay') {
            setCurrentStep('city');
            setSelectedBarangay(null);
        } else if (currentStep === 'city') {
            setCurrentStep('province');
            setSelectedCity(null);
        } else if (currentStep === 'province') {
            setCurrentStep('region');
            setSelectedProvince(null);
        }
    };

    const handleConfirm = () => {
        if (selectedRegion && selectedProvince && selectedCity && selectedBarangay) {
            onConfirm({
                region: selectedRegion.name,
                province: selectedProvince.name,
                city: selectedCity.name,
                barangay: selectedBarangay.name,
            });
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 'region': return 'Select Region';
            case 'province': return 'Select Province';
            case 'city': return 'Select City/Municipality';
            case 'barangay': return 'Select Barangay';
        }
    };

    const breadcrumbs = [
        { label: selectedRegion?.name, step: 'region' },
        { label: selectedProvince?.name, step: 'province' },
        { label: selectedCity?.name, step: 'city' },
        { label: selectedBarangay?.name, step: 'barangay' }
    ].filter(b => b.label);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={currentStep === 'region' ? onClose : handleBack} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.title}>{getStepTitle()}</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <View style={styles.breadcrumbContainer}>
                    <ScrollView 
                        ref={scrollViewRef}
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.breadcrumbScroll}
                    >
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.step}>
                                {idx > 0 && <Ionicons name="chevron-forward" size={16} color={theme.colors.textLight} style={styles.crumbIcon} />}
                                <View style={styles.crumbBadge}>
                                    <Text style={styles.crumbText}>{crumb.label}</Text>
                                </View>
                            </React.Fragment>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={theme.colors.textLight} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${currentStep}...`}
                    placeholderTextColor={theme.colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Options List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading options...</Text>
                </View>
            ) : filteredOptions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No results found.</Text>
                </View>
            ) : (
                <SectionList<LocationOption, { title: string }>
                    sections={(() => {
                        const sorted = [...filteredOptions].sort((a, b) => a.name.localeCompare(b.name));
                        const groups: { title: string; data: LocationOption[] }[] = [];
                        sorted.forEach(opt => {
                            const firstLetter = opt.name.charAt(0).toUpperCase();
                            const lastGroup = groups[groups.length - 1];
                            if (!lastGroup || lastGroup.title !== firstLetter) {
                                groups.push({ title: firstLetter, data: [opt] });
                            } else {
                                lastGroup.data.push(opt);
                            }
                        });
                        return groups;
                    })()}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }: { item: LocationOption }) => {
                        let isSelected = false;
                        if (currentStep === 'region') isSelected = selectedRegion?.code === item.code;
                        if (currentStep === 'province') isSelected = selectedProvince?.code === item.code;
                        if (currentStep === 'city') isSelected = selectedCity?.code === item.code;
                        if (currentStep === 'barangay') isSelected = selectedBarangay?.code === item.code;

                        return (
                            <Pressable
                                style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                onPress={() => handleSelect(item)}
                            >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                    {item.name}
                                </Text>
                                {isSelected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                            </Pressable>
                        );
                    }}
                    renderSectionHeader={({ section: { title } }: { section: { title: string } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    stickySectionHeadersEnabled={true}
                    style={styles.optionsList}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Confirm Button */}
            {selectedBarangay && (
                <View style={styles.footer}>
                    <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                        <Text style={styles.confirmText}>Confirm Address</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        minHeight: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    backBtn: { padding: 4, marginLeft: -4 },
    closeBtn: { padding: 4 },
    breadcrumbContainer: {
        backgroundColor: theme.colors.subtle,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    breadcrumbScroll: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
    },
    crumbBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    crumbText: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
        fontFamily: theme.typography.fontFamily,
    },
    crumbIcon: {
        marginHorizontal: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: theme.colors.subtle,
        borderRadius: 10,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    optionsList: {
        maxHeight: 400,
        paddingHorizontal: 16,
    },
    loadingContainer: {
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontFamily: theme.typography.fontFamily,
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textLight,
        fontSize: 15,
        fontFamily: theme.typography.fontFamily,
    },
    sectionHeader: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    sectionHeaderText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    optionItemSelected: {
        backgroundColor: '#FDF2F4', // Light pink/primary tint
    },
    optionText: {
        fontSize: 15,
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    optionTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        marginTop: 8,
    },
    confirmBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: theme.typography.fontFamily,
    },
});

export default LocationPickerModal;
