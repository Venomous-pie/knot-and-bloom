import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable } from 'react-native';
import { theme } from '@/constants/theme';
import ProductCard from '@/components/product/ProductCard';
import ProductCardSkeleton from '@/components/product/ProductCardSkeleton';
import { productAPI } from '@/services/api';
import type { Product } from '@/types/products';
import { useRouter, RelativePathString } from 'expo-router';

export default function RecentPurchasesSection() {
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const isMobile = width < 768;
  const itemWidth = isMobile ? 160 : 217.6;

  const fetchRecentPurchases = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await productAPI.getRecentPurchases();
      
      if (response.data?.success) {
        setProducts(response.data.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to load recent purchases', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentPurchases();
  }, [fetchRecentPurchases]);

  if (!loading && products.length === 0) {
      return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>RECENT PURCHASES</Text>

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
                  <Pressable onPress={() => router.push(`/product/${product.uid}` as RelativePathString)}>
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
