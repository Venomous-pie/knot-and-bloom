import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

const CATEGORIES = [
  { id: 'stuffed-toys', title: 'STUFFED TOYS', count: '24 items' },
  { id: 'wire-flowers', title: 'WIRE FLOWERS', count: '18 items' },
  { id: 'keychains', title: 'KEYCHAINS', count: '31 items' },
  { id: 'gift-sets', title: 'GIFT SETS', count: '12 items' },
];

export default function CategoriesSection() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isMobile = width < 768;
  const numColumns = isMobile ? 2 : 4;
  const gap = theme.spacing.md;

  // Calculate exact width to avoid calc() which is invalid in React Native ViewStyle
  const containerWidth = Math.min(width, 1200);
  const padding = theme.spacing.lg * 2;
  const availableWidth = containerWidth - padding;
  const itemWidth = (availableWidth - (gap * (numColumns - 1))) / numColumns;

  return (
    <View style={styles.container}>
        <Text style={styles.sectionTitle}>CATEGORIES</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat, index) => (
            <Pressable
              key={cat.id}
              style={[
                styles.card,
                { width: itemWidth }
              ]}
              onPress={() => router.push(`/search?category=${cat.id}`)}
            >
              <Text style={styles.cardTitle}>{cat.title}</Text>
              <Text style={styles.cardSubtitle}>{cat.count}</Text>
            </Pressable>
          ))}
        </View>
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
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  }
});
