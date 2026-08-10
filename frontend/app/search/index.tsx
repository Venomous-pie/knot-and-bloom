import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { Search, ChevronLeft, History, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { productAPI } from '@/services/api';
import { Product } from '@/types/products';
import SearchBarDropdown from '@/components/ui/SearchResults';
import { Ionicons } from '@expo/vector-icons';

export interface SearchHistoryItem {
    term: string;
    count: number;
    lastSearched: number;
}

export default function SearchPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [historyLimit, setHistoryLimit] = useState(4);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        loadSearchHistory();
        loadSuggestions();
    }, []);

    const loadSearchHistory = async () => {
        try {
            const history = await AsyncStorage.getItem('search_history');
            if (history) {
                const parsed = JSON.parse(history);
                // Defensive parse: check if it's the old array of strings format
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                    // Stale data, discard to prevent crashes
                    await AsyncStorage.removeItem('search_history');
                    setSearchHistory([]);
                } else if (Array.isArray(parsed)) {
                    setSearchHistory(parsed as SearchHistoryItem[]);
                }
            }
        } catch (error) {
            console.error('Failed to load search history', error);
        }
    };

    const loadSuggestions = async () => {
        try {
            const res = await productAPI.searchProducts('', 4);
            setSuggestedProducts(res.data.products);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        }
    };

    const addToSearchHistory = async (query: string) => {
        if (!query.trim()) return;
        try {
            let newHistory = [...searchHistory];
            const existingIndex = newHistory.findIndex(h => h.term === query);
            
            if (existingIndex >= 0) {
                newHistory[existingIndex].count += 1;
                newHistory[existingIndex].lastSearched = Date.now();
            } else {
                newHistory.push({ term: query, count: 1, lastSearched: Date.now() });
            }
            
            // Sort by most recently searched, limit to 50
            newHistory.sort((a, b) => b.lastSearched - a.lastSearched);
            newHistory = newHistory.slice(0, 50);
            
            setSearchHistory(newHistory);
            await AsyncStorage.setItem('search_history', JSON.stringify(newHistory));
        } catch (error) {
            console.error('Failed to save search history', error);
        }
    };

    const removeFromHistory = async (e: any, query: string) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        try {
            const newHistory = searchHistory.filter(h => h.term !== query);
            setSearchHistory(newHistory);
            await AsyncStorage.setItem('search_history', JSON.stringify(newHistory));
        } catch (error) {
            console.error('Failed to remove history item', error);
        }
    };

    const handleSearch = async (search: string) => {
        try {
            const result = await productAPI.searchProducts(search);
            setProducts(result.data.products);
        } catch (error) {
            console.error("Error searching products", error);
        }
    };

    const submitSearch = (search: string) => {
        addToSearchHistory(search);
        if (search.trim()) {
            router.push(`/search/results?q=${encodeURIComponent(search.trim())}` as any);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header / Search Bar Area */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.colors.text} />
                </Pressable>

                <View style={styles.searchBar}>
                    <Search size={18} color={theme.colors.textLight} />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Search products..."
                        placeholderTextColor={theme.colors.textLight}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            handleSearch(text);
                        }}
                        onSubmitEditing={(e) => submitSearch(e.nativeEvent.text)}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')}>
                            <X size={18} color={theme.colors.textLight} />
                        </Pressable>
                    )}
                </View>

                {/* Optional: Right search button action if needed, or keeping it clean */}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                {/* Search History */}
                {!searchQuery && searchHistory.length > 0 && (
                    <View style={{ marginBottom: 30 }}>
                        <Text style={styles.sectionTitle}>Recent Searches</Text>
                        {searchHistory.slice(0, historyLimit).map((item, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Pressable
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                    onPress={() => {
                                        setSearchQuery(item.term);
                                        handleSearch(item.term);
                                        submitSearch(item.term);
                                    }}
                                >
                                    <History size={16} color={theme.colors.textLight} />
                                    <Text style={{ fontSize: 14, color: theme.colors.text }}>{item.term}</Text>
                                </Pressable>
                                <Pressable onPress={(e) => removeFromHistory(e, item.term)} style={{ padding: 5 }}>
                                    <X size={16} color={theme.colors.border} />
                                </Pressable>
                            </View>
                        ))}
                        {searchHistory.length > historyLimit && (
                            <Pressable
                                style={{ marginTop: 10, alignItems: 'center', padding: 10 }}
                                onPress={() => setHistoryLimit(prev => prev + 4)}
                            >
                                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Load More</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                {/* Suggestions or Results */}
                {(searchQuery || suggestedProducts.length > 0) && (
                    <View>
                        <Text style={styles.sectionTitle}>
                            {searchQuery ? "Search Results" : (searchHistory.length > 0 ? "You may like" : "Suggested for you")}
                        </Text>

                        {(searchQuery && products.length === 0) ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="search" size={64} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.emptyTitle}>No products found</Text>
                            </View>
                        ) : (
                            <SearchBarDropdown
                                products={searchQuery ? products : suggestedProducts}
                                onClose={() => { }}
                                mode="grid"
                                title=""
                            />
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15, // Status bar padding
        paddingBottom: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
        gap: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.subtle,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        height: '100%',
        borderWidth: 0,
        outlineStyle: 'none' as any,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.subtle,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        backgroundColor: 'white',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
    },
    emptyTitle: {
        fontFamily: theme.typography.fontFamily,
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
});
