import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import ProductCard from '@/components/ProductCard';
import { useProducts } from '@/hooks/useProducts';

export default function BestsellersSection() {
  const { width } = useWindowDimensions();
  const { products, loading } = useProducts({ limit: 3 });

  const isMobile = width < 768;
  const numColumns = isMobile ? 1 : 3;
  const gap = theme.spacing.lg;

  // Calculate exact width to avoid calc() which is invalid in React Native ViewStyle
  const containerWidth = Math.min(width, 1200);
  const padding = theme.spacing.lg * 2;
  const availableWidth = containerWidth - padding;
  const itemWidth = isMobile ? '100%' : (availableWidth - (gap * (numColumns - 1))) / numColumns;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>BESTSELLERS</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          {products.slice(0, 3).map((product) => (
            <ProductCard
              key={product.uid}
              product={product}
              style={{ width: itemWidth }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'flex-start',
  },
  gridMobile: {
    flexDirection: 'column',
  }
});
