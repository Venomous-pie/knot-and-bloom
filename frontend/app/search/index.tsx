import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, ChevronLeft, History, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { productAPI } from '@/api/api';
import { Product } from '@/types/products';
import SearchBarDropdown from '@/shared/SearchResults';

export default function SearchPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
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
                setSearchHistory(JSON.parse(history));
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
            let newHistory = [query, ...searchHistory.filter(h => h !== query)];
            newHistory = newHistory.slice(0, 20);
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
            const newHistory = searchHistory.filter(h => h !== query);
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
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header / Search Bar Area */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color="#333" />
                </Pressable>

                <View style={styles.searchBar}>
                    <Search size={18} color="#999" />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Search products..."
                        placeholderTextColor="#999"
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
                            <X size={18} color="#999" />
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
                        {searchHistory.slice(0, historyLimit).map((term, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Pressable
                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                                    onPress={() => {
                                        setSearchQuery(term);
                                        handleSearch(term);
                                        submitSearch(term);
                                    }}
                                >
                                    <History size={16} color="#999" />
                                    <Text style={{ fontSize: 14, color: '#333' }}>{term}</Text>
                                </Pressable>
                                <Pressable onPress={(e) => removeFromHistory(e, term)} style={{ padding: 5 }}>
                                    <X size={16} color="#ccc" />
                                </Pressable>
                            </View>
                        ))}
                        {searchHistory.length > historyLimit && (
                            <Pressable
                                style={{ marginTop: 10, alignItems: 'center', padding: 10 }}
                                onPress={() => setHistoryLimit(prev => prev + 4)}
                            >
                                <Text style={{ color: '#B36979', fontWeight: 'bold' }}>Load More</Text>
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
                            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40 }}>
                                <Search size={48} color="#f0f0f0" />
                                <Text style={{ marginTop: 10, color: '#999' }}>No products found</Text>
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
        borderBottomColor: '#f0f0f0',
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
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
        borderWidth: 0,
        outlineStyle: 'none' as any,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
});
