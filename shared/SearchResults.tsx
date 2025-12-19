import ProductCard from '@/components/ProductCard';
import { getCategorySlug } from '@/constants/categories';
import { Product } from '@/types/products';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        zIndex: 1000,
    },
    list: {
        maxHeight: 300,
    },
    gridList: {
        maxHeight: '100%',
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    itemPressed: {
        backgroundColor: '#f9f9f9',
    },
    image: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: '#f0f0f0',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    category: {
        fontSize: 11,
        color: '#888',
        textTransform: 'capitalize',
        marginBottom: 2,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    price: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    discountedPrice: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#3d3d3dff',
    },
    originalPrice: {
        fontSize: 11,
        color: '#999',
        textDecorationLine: 'line-through',
    },
    backdrop: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
});

interface SearchBarDropdownProps {
    products: Product[];
    onClose: () => void;
    mode?: 'list' | 'grid';
    title?: string;
}

const SearchBarDropdown = ({ products, onClose, mode = 'list', title }: SearchBarDropdownProps) => {
    const router = useRouter();

    if (!products || products.length === 0) {
        return null;
    }

    const displayProducts = mode === 'list' ? products.slice(0, 5) : products;

    return (
        <>
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
            />
            <View style={[styles.container, mode === 'grid' && { flex: 1, borderWidth: 0, borderRadius: 0, shadowOpacity: 0 }]}>
                {title && (
                    <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: '#333',
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: 12,
                    }}>
                        {title}
                    </Text>
                )}
                <FlatList
                    data={displayProducts}
                    keyExtractor={(item) => String(item.uid)}
                    numColumns={mode === 'grid' ? 2 : 1}
                    key={mode} // Force re-render when switching modes
                    contentContainerStyle={mode === 'grid' && { paddingHorizontal: 8 }}
                    renderItem={({ item }) => {
                        if (mode === 'grid') {
                            return (
                                <ProductCard
                                    product={item}
                                    onPress={onClose}
                                />
                            );
                        }

                        return (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.itemContainer,
                                    pressed && styles.itemPressed
                                ]}
                                onPress={() => {
                                    const slug = getCategorySlug(item.category);
                                    router.push(`/products/${slug}?highlighted_id=${item.uid}`);
                                    onClose();
                                }}
                            >
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.image, styles.placeholderImage]}>
                                        <Text>📦</Text>
                                    </View>
                                )}
                                <View style={styles.textContainer}>
                                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.category}>{item.category}</Text>
                                    <View style={styles.priceContainer}>
                                        {Number(item.discountedPrice) ? (
                                            <>
                                                <Text style={styles.discountedPrice}>
                                                    ₱{Number(item.discountedPrice).toFixed(2)}
                                                </Text>
                                                <Text style={styles.originalPrice}>
                                                    ₱{Number(item.basePrice).toFixed(2)}
                                                </Text>
                                            </>
                                        ) : (
                                            <Text style={styles.price}>
                                                ₱{Number(item.basePrice).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </Pressable>
                        );
                    }}
                    style={mode === 'grid' ? styles.gridList : styles.list}
                />
            </View>
        </>
    );
};

export default SearchBarDropdown;