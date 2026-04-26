import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { productAPI } from '@/api/api';
import { categoryTitles } from '@/constants/categories';

const PATTERNS = [
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEuNSIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTS0yLDIgbDQsLTQgTTAsMjAgbDIwLC0yMCBNMTgsMjIgbDQsLTQiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTSAxMCAwIEwgMTAgMjAgTSAwIDEwIEwgMjAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+'
];

const CATEGORY_CONFIG: Record<string, any> = {
  'gift-boxes-sets': { subtitle: 'Perfect for gifting', emoji: '🎁', bgColor: '#EBE5F7', badgeBg: '#CBBDEB', color: '#4A3482' },
  'fuzzy-wire-bouquet': { subtitle: 'Everlasting blooms', emoji: '💐', bgColor: '#E2EFE1', badgeBg: '#A6C9AD', color: '#2B5738' },
  'crochet-key-chains': { subtitle: 'Carry a little charm', emoji: '🔑', bgColor: '#FDF1DA', badgeBg: '#EACC9F', color: '#7A5A29' },
  'crochet': { subtitle: 'Handmade with love', emoji: '🧶', bgColor: '#FCE7EB', badgeBg: '#F1B8C8', color: '#88314E' },
  'fuzzy-wire-art': { subtitle: 'Bendable creations', emoji: '🧶', bgColor: '#E2EFE1', badgeBg: '#A6C9AD', color: '#2B5738' },
  'tops': { subtitle: 'Wearable art', emoji: '👚', bgColor: '#FDF1DA', badgeBg: '#EACC9F', color: '#7A5A29' },
  'hair-tie': { subtitle: 'Cute accessories', emoji: '🎀', bgColor: '#EBE5F7', badgeBg: '#CBBDEB', color: '#4A3482' },
  'crochet-flower-bouquet': { subtitle: 'Never wilting', emoji: '🌷', bgColor: '#FCE7EB', badgeBg: '#F1B8C8', color: '#88314E' },
};

const FALLBACK_CONFIGS = [
  { subtitle: 'Handmade with love', emoji: '🧶', bgColor: '#FCE7EB', badgeBg: '#F1B8C8', color: '#88314E' },
  { subtitle: 'Cute & collectible', emoji: '🎀', bgColor: '#E2EFE1', badgeBg: '#A6C9AD', color: '#2B5738' },
  { subtitle: 'Carry a little charm', emoji: '🎁', bgColor: '#FDF1DA', badgeBg: '#EACC9F', color: '#7A5A29' },
  { subtitle: 'Perfect for gifting', emoji: '🧶', bgColor: '#EBE5F7', badgeBg: '#CBBDEB', color: '#4A3482' },
];

const DEFAULT_CATEGORIES = [
  { id: 'crochet-key-chains', title: 'Key Chains', count: 'Coming soon', emoji: '🔑', bgColor: '#FDF1DA', badgeBg: '#EACC9F', color: '#7A5A29', subtitle: 'Carry a little charm' },
  { id: 'gift-boxes-sets', title: 'Gift Boxes / Sets', count: 'Coming soon', emoji: '🎁', bgColor: '#EBE5F7', badgeBg: '#CBBDEB', color: '#4A3482', subtitle: 'Perfect for gifting' },
  { id: 'fuzzy-wire-bouquet', title: 'Wire Bouquets', count: 'Coming soon', emoji: '💐', bgColor: '#E2EFE1', badgeBg: '#A6C9AD', color: '#2B5738', subtitle: 'Everlasting blooms' },
  { id: 'crochet', title: 'Crochet', count: 'Coming soon', emoji: '🧶', bgColor: '#FCE7EB', badgeBg: '#F1B8C8', color: '#88314E', subtitle: 'Handmade with love' },
];

export default function CategoriesSection() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  
  const isMobile = width < 768;
  const gap = theme.spacing.md;
  
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await productAPI.getCategoryCounts();
        if (response.data.success) {
          const counts = response.data.counts;
          
          // Get top 4 categories by count
          const sortedCategories = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

          const dynamicCategories = sortedCategories.map(([id, count], index) => {
            const config = CATEGORY_CONFIG[id] || FALLBACK_CONFIGS[index % 4];
            const title = categoryTitles[id] || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            
            return {
              id,
              title,
              count: count === 0 ? 'Coming soon' : `${count} item${count === 1 ? '' : 's'}`,
              ...config
            };
          });

          // Fill up to 4 if we don't have enough data
          const finalCategories = [...dynamicCategories];
          let defaultIndex = 0;
          while (finalCategories.length < 4) {
             const def = DEFAULT_CATEGORIES[defaultIndex];
             if (!finalCategories.find(c => c.id === def.id)) {
                finalCategories.push({ ...def });
             }
             defaultIndex++;
          }

          setCategories(finalCategories as typeof DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };
    fetchCounts();
  }, []);
  
  const [toys, flowers, keychains, gifts] = categories;
  
  const renderCard = (cat: typeof DEFAULT_CATEGORIES[0], style: any, emojiSize = 24, index = 0) => {
    const patternUri = PATTERNS[index % PATTERNS.length];
    return (
      <Pressable 
        key={cat.id} 
        style={({ pressed, hovered }: any) => [
          styles.card, 
          { backgroundColor: cat.bgColor }, 
          style,
          hovered && { transform: [{ scale: 1.02 }], shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
          pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => router.push(`/search?category=${cat.id}` as any)}
      >
        <Image 
          source={{ uri: patternUri }} 
          style={[StyleSheet.absoluteFill, { opacity: 0.7 }]} 
          resizeMode="repeat" 
        />
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: cat.badgeBg || cat.color + '33' }]}>
            <Text style={[styles.badgeText, { color: cat.color }]}>{cat.count}</Text>
          </View>
          <Text style={{ fontSize: emojiSize * 1.5, opacity: 0.25 }}>{cat.emoji}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardTitle, { color: cat.color }]}>{cat.title}</Text>
          <Text style={[styles.cardSubtitle, { color: cat.color }]}>{cat.subtitle}</Text>
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CATEGORIES</Text>
      
      {isMobile ? (
        <View style={[styles.bentoMobile, { gap }]}>
          {renderCard(toys, { minHeight: 180 }, 32, 0)}
          {renderCard(flowers, { minHeight: 140 }, 28, 1)}
          <View style={[styles.bentoRow, { gap }]}>
            {renderCard(keychains, { flex: 1, minHeight: 140 }, 24, 2)}
            {renderCard(gifts, { flex: 1, minHeight: 140 }, 24, 3)}
          </View>
        </View>
      ) : (
        <View style={[styles.bentoDesktop, { gap }]}>
          {/* Left Column - Large Card */}
          <View style={{ flex: 1 }}>
            {renderCard(toys, { flex: 1, minHeight: 400 }, 48, 0)}
          </View>
          
          {/* Right Column */}
          <View style={[styles.rightCol, { gap }]}>
            {/* Top Wide Card */}
            {renderCard(flowers, { flex: 1, minHeight: 180 }, 32, 1)}
            
            {/* Bottom 2 Square Cards */}
            <View style={[styles.bentoRow, { gap, flex: 1 }]}>
              {renderCard(keychains, { flex: 1 }, 24, 2)}
              {renderCard(gifts, { flex: 1 }, 24, 3)}
            </View>
          </View>
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
  bentoDesktop: {
    flexDirection: 'row',
    height: 400, // Fixed height for the bento box on desktop
  },
  bentoMobile: {
    flexDirection: 'column',
  },
  rightCol: {
    flex: 1,
    flexDirection: 'column',
  },
  bentoRow: {
    flexDirection: 'row',
  },
  card: {
    borderRadius: 12,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600' as any,
  },
  cardFooter: {
    marginTop: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700' as any,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500' as any,
    opacity: 0.8,
  }
});
