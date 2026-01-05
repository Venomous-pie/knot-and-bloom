import React, { useState, useEffect } from 'react';
import {
    View, Text, Pressable, Modal, ScrollView, StyleSheet, TextInput, ActivityIndicator, SectionList
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

type TabKey = 'region' | 'province' | 'city' | 'barangay';
const TABS: { key: TabKey; label: string }[] = [
    { key: 'region', label: 'Region' },
    { key: 'province', label: 'Province' },
    { key: 'city', label: 'City' },
    { key: 'barangay', label: 'Barangay' },
];

interface LocationOption {
    code: string;
    name: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
    visible, onClose, onConfirm, initialValue
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>('region');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Data state
    const [regions, setRegions] = useState<LocationOption[]>([]);
    const [provinces, setProvinces] = useState<LocationOption[]>([]);
    const [cities, setCities] = useState<LocationOption[]>([]);
    const [barangays, setBarangays] = useState<LocationOption[]>([]);

    // Selection state (storing both code and name)
    const [selectedRegion, setSelectedRegion] = useState<LocationOption | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<LocationOption | null>(null);
    const [selectedCity, setSelectedCity] = useState<LocationOption | null>(null);
    const [selectedBarangay, setSelectedBarangay] = useState<LocationOption | null>(null);

    // Initial load and reset
    useEffect(() => {
        if (visible) {
            loadRegions();
            resetSelection();
            if (initialValue) {
                // Note: We can't easily pre-fill without codes, so we might start fresh
                // Or we'd need to implementing reverse lookup which is complex.
                // For now, let's start fresh if it's a new open, or just keep state if not provided.
            }
        }
    }, [visible]);

    const resetSelection = () => {
        setActiveTab('region');
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
        switch (activeTab) {
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
        if (activeTab === 'region') {
            setSelectedRegion(option);
            setSelectedProvince(null);
            setSelectedCity(null);
            setSelectedBarangay(null);
            loadProvinces(option.code);
            setActiveTab('province');
        } else if (activeTab === 'province') {
            setSelectedProvince(option);
            setSelectedCity(null);
            setSelectedBarangay(null);
            loadCities(option.code);
            setActiveTab('city');
        } else if (activeTab === 'city') {
            setSelectedCity(option);
            setSelectedBarangay(null);
            loadBarangays(option.code);
            setActiveTab('barangay');
        } else {
            setSelectedBarangay(option);
        }
        setSearchQuery('');
    };

    const handleTabPress = (tab: TabKey) => {
        const canNavigate = (
            (tab === 'region') ||
            (tab === 'province' && selectedRegion !== null) ||
            (tab === 'city' && selectedProvince !== null) ||
            (tab === 'barangay' && selectedCity !== null)
        );
        if (canNavigate) {
            setActiveTab(tab);
            setSearchQuery('');
        }
    };

    const isComplete = selectedRegion && selectedProvince && selectedCity && selectedBarangay;

    const handleConfirm = () => {
        if (isComplete) {
            onConfirm({
                region: selectedRegion!.name,
                province: selectedProvince!.name,
                city: selectedCity!.name,
                barangay: selectedBarangay!.name,
            });
        }
    };

    const getTabLabel = (tab: TabKey): string => {
        let val = '';
        if (tab === 'region') val = selectedRegion?.name || '';
        if (tab === 'province') val = selectedProvince?.name || '';
        if (tab === 'city') val = selectedCity?.name || '';
        if (tab === 'barangay') val = selectedBarangay?.name || '';

        if (val) {
            return val.length > 12 ? val.substring(0, 10) + '...' : val;
        }
        return TABS.find(t => t.key === tab)?.label || '';
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Location</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={theme.colors.text} />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabs}>
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const isAccessible = (
                                tab.key === 'region' ||
                                (tab.key === 'province' && selectedRegion) ||
                                (tab.key === 'city' && selectedProvince) ||
                                (tab.key === 'barangay' && selectedCity)
                            );
                            return (
                                <Pressable
                                    key={tab.key}
                                    style={[styles.tab, isActive && styles.tabActive, !isAccessible && styles.tabDisabled]}
                                    onPress={() => handleTabPress(tab.key)}
                                >
                                    <Text style={[styles.tabText, isActive && styles.tabTextActive, !isAccessible && styles.tabTextDisabled]}>
                                        {getTabLabel(tab.key)}
                                    </Text>
                                    {isActive && <View style={styles.tabIndicator} />}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={18} color={theme.colors.textLight} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={`Search ${activeTab}...`}
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
                            <Text style={styles.emptyText}>
                                {getCurrentOptions().length === 0
                                    ? `Select a ${TABS[TABS.findIndex(t => t.key === activeTab) - 1]?.label || 'region'} first`
                                    : 'No results found'}
                            </Text>
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
                                if (activeTab === 'region') isSelected = selectedRegion?.code === item.code;
                                if (activeTab === 'province') isSelected = selectedProvince?.code === item.code;
                                if (activeTab === 'city') isSelected = selectedCity?.code === item.code;
                                if (activeTab === 'barangay') isSelected = selectedBarangay?.code === item.code;

                                return (
                                    <Pressable
                                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {item.name}
                                        </Text>
                                        {isSelected && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
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
                    {isComplete && (
                        <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmText}>Confirm Location</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    closeBtn: { padding: 4 },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        position: 'relative',
    },
    tabActive: {},
    tabDisabled: { opacity: 0.4 },
    tabText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    tabTextDisabled: {},
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: 3,
        backgroundColor: theme.colors.primary,
        borderRadius: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
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
    },
    optionsList: {
        maxHeight: 320,
        paddingHorizontal: 16,
    },
    loadingContainer: {
        height: 320,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
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
        color: theme.colors.primary,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginBottom: 4,
    },
    optionItemSelected: {
        backgroundColor: theme.colors.primaryLight,
    },
    optionText: {
        fontSize: 15,
        color: theme.colors.text,
    },
    optionTextSelected: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: theme.colors.textLight,
        paddingVertical: 32,
        fontSize: 14,
    },
    confirmBtn: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LocationPickerModal;
