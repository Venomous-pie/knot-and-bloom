import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton';
import { productAPI } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@/types/products';
import type { SearchHistoryItem } from '@/app/search/index';
import { useRouter } from 'expo-router';

export default function RecommendationsSection() {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const isMobile = width < 768;
  const itemWidth = isMobile ? 160 : 217.6;

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      // Load search history safely
      let searchData: SearchHistoryItem[] = [];
      const historyStr = await AsyncStorage.getItem('search_history');
      if (historyStr) {
          const parsed = JSON.parse(historyStr);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] !== 'string') {
              searchData = parsed;
          }
      }

      const response = await productAPI.getRecommendations(searchData);
      
      if (response.data?.success) {
        setProducts(response.data.products);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load recommendations', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (error && products.length === 0) {
      // Gracefully hide or show retry if empty and errored
      return null;
  }

  if (!loading && products.length === 0) {
      return null;
  }

  const handleProductPress = (product: Product) => {
      // Future metrics tracking can be hooked here (impression / click tracking)
      router.push(`/product/${product.uid}` as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>RECOMMENDED FOR YOU</Text>

      <View style={styles.gridContainer}>
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((key) => (
              <ProductCardSkeleton
                key={key}
                style={{ width: itemWidth }}
              />
            ))}
          </>
        ) : (
          <>
            {products.slice(0, showAll ? products.length : 5).map((product) => (
              <View 
                key={product.uid} 
                style={{ width: itemWidth }}
              >
                  <Pressable onPress={() => handleProductPress(product)}>
                      <View pointerEvents="none">
                          <ProductCard product={product} />
                      </View>
                  </Pressable>
              </View>
            ))}
          </>
        )}
      </View>
      {!loading && products.length > 5 && !showAll && (
          <View style={styles.loadMoreContainer}>
              <Pressable style={styles.loadMoreButton} onPress={() => setShowAll(true)}>
                  <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
          </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
    paddingLeft: theme.spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.lg,
  },
  loadMoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  loadMoreText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.sizes.sm,
  }
});
