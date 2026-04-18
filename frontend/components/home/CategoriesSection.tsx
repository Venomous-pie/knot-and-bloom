import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Flower, Key, Gift, Panda } from 'lucide-react-native';

const CATEGORIES = [
  { id: 'stuffed-toys', title: 'STUFFED TOYS', count: '24 items', icon: Panda, bgColor: theme.colors.primaryLight, color: theme.colors.primaryDark },
  { id: 'wire-flowers', title: 'WIRE FLOWERS', count: '18 items', icon: Flower, bgColor: theme.colors.secondaryLight, color: theme.colors.secondary },
  { id: 'keychains', title: 'KEYCHAINS', count: '31 items', icon: Key, bgColor: theme.colors.backgroundAlt, color: theme.colors.textSecondary },
  { id: 'gift-sets', title: 'GIFT SETS', count: '12 items', icon: Gift, bgColor: theme.colors.surface, color: theme.colors.textSecondary },
];

export default function CategoriesSection() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  
  const isMobile = width < 768;
  const gap = theme.spacing.md;
  
  const [toys, flowers, keychains, gifts] = CATEGORIES;
  
  const renderCard = (cat: typeof CATEGORIES[0], style: any, iconSize = 24) => {
    const Icon = cat.icon;
    return (
      <Pressable 
        key={cat.id} 
        style={[styles.card, { backgroundColor: cat.bgColor }, style]}
        onPress={() => router.push(`/search?category=${cat.id}`)}
      >
        {/* Background Pattern */}
        <View style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', top: -20, left: -20, opacity: 0.05, transform: [{ rotate: '15deg' }] }}>
            <Icon size={120} color={cat.color} />
          </View>
          <View style={{ position: 'absolute', bottom: -30, right: -20, opacity: 0.05, transform: [{ rotate: '-15deg' }] }}>
            <Icon size={160} color={cat.color} />
          </View>
          <View style={{ position: 'absolute', top: 40, right: '30%', opacity: 0.05, transform: [{ rotate: '45deg' }] }}>
            <Icon size={80} color={cat.color} />
          </View>
        </View>

        <View style={styles.cardHeader}>
          <Icon size={iconSize} color={cat.color} strokeWidth={1.5} />
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.cardTitle, { color: cat.color }]}>{cat.title}</Text>
          <Text style={[styles.cardSubtitle, { color: cat.color, opacity: 0.8 }]}>{cat.count}</Text>
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>CATEGORIES</Text>
      
      {isMobile ? (
        <View style={[styles.bentoMobile, { gap }]}>
          {renderCard(toys, { minHeight: 180 }, 32)}
          {renderCard(flowers, { minHeight: 140 }, 28)}
          <View style={[styles.bentoRow, { gap }]}>
            {renderCard(keychains, { flex: 1, minHeight: 140 })}
            {renderCard(gifts, { flex: 1, minHeight: 140 })}
          </View>
        </View>
      ) : (
        <View style={[styles.bentoDesktop, { gap }]}>
          {/* Left Column - Large Card */}
          <View style={{ flex: 1 }}>
            {renderCard(toys, { flex: 1, minHeight: 400 }, 48)}
          </View>
          
          {/* Right Column */}
          <View style={[styles.rightCol, { gap }]}>
            {/* Top Wide Card */}
            {renderCard(flowers, { flex: 1, minHeight: 180 }, 32)}
            
            {/* Bottom 2 Square Cards */}
            <View style={[styles.bentoRow, { gap, flex: 1 }]}>
              {renderCard(keychains, { flex: 1 })}
              {renderCard(gifts, { flex: 1 })}
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  cardFooter: {
    marginTop: theme.spacing.xl,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: theme.typography.sizes.sm,
  }
});
