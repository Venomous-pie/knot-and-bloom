import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function Footer() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.grid, isMobile && styles.gridMobile]}>
        {/* LOGO + TAGLINE */}
        <View style={styles.column}>
          <Text style={styles.logoTitle}>Knot & Bloom</Text>
          <Text style={styles.text}>Handcrafted with love.</Text>
          <Text style={styles.text}>Made with passion.</Text>
        </View>

        {/* SHOP LINKS */}
        <View style={styles.column}>
          <Text style={styles.title}>SHOP LINKS</Text>
          <Pressable onPress={() => router.push('/search?category=stuffed-toys')}>
            <Text style={styles.link}>Toys</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/search?category=wire-flowers')}>
            <Text style={styles.link}>Flowers</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/search?category=keychains')}>
            <Text style={styles.link}>Keychains</Text>
          </Pressable>
        </View>

        {/* INFO LINKS */}
        <View style={styles.column}>
          <Text style={styles.title}>INFO LINKS</Text>
          <Pressable onPress={() => router.push('/about')}>
            <Text style={styles.link}>About</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/customer-service')}>
            <Text style={styles.link}>FAQs</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/customer-service')}>
            <Text style={styles.link}>Shipping</Text>
          </Pressable>
        </View>

        {/* SOCIALS */}
        <View style={styles.column}>
          <Text style={styles.title}>SOCIALS</Text>
          <Pressable>
            <Text style={styles.link}>Instagram</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.link}>Facebook</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.link}>TikTok</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.copyrightText}>
          © {new Date().getFullYear()} Knot & Bloom. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 150,
  },
  logoTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  text: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  link: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    padding: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  copyrightText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textLight,
  }
});
