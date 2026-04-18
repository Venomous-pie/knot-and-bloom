import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ShoppingBag, Image as ImageIcon } from 'lucide-react-native';

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  return (
    <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
      {/* Left Content */}
      <View style={[styles.contentSection, isMobile ? styles.contentMobile : styles.contentDesktop]}>
        <Text style={styles.headline}>Handmade things,{'\n'}heartfelt stories.</Text>
        <Text style={styles.tagline}>The kind of gift they'll actually keep.</Text>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/products/all-products' as any)}
          >
            <ShoppingBag size={18} color={theme.colors.surface} style={{ marginRight: theme.spacing.sm }} />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>SHOP NOW</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/customer-service')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>CUSTOM ORDER</Text>
          </Pressable>
        </View>
      </View>

      {/* Right Content / Image Collage */}
      <View style={[styles.imageSection, isMobile ? styles.imageMobile : styles.imageDesktop]}>
        <View style={styles.imagePlaceholder}>
          <ImageIcon size={48} color={theme.colors.textLight} strokeWidth={1.5} />
          <Text style={styles.imagePlaceholderText}>HERO IMAGE / PRODUCT COLLAGE</Text>
          <Text style={styles.imagePlaceholderSubText}>Crochet • flowers • keychains</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  containerMobile: {
    flexDirection: 'column',
  },
  containerDesktop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: theme.spacing['2xl'],
    minHeight: 500,
  },
  contentSection: {
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  contentMobile: {
    alignItems: 'center',
    textAlign: 'center',
  },
  contentDesktop: {
    flex: 1,
    paddingRight: theme.spacing.xl,
  },
  headline: {
    fontSize: 40,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold as any,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold as any,
  },
  buttonText: {
    fontSize: theme.typography.sizes.sm,
    letterSpacing: 1,
  },
  imageSection: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageMobile: {
    width: '100%',
    aspectRatio: 1,
    marginTop: theme.spacing.lg,
  },
  imageDesktop: {
    flex: 1,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  imagePlaceholderText: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.bold as any,
    fontSize: theme.typography.sizes.base,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  imagePlaceholderSubText: {
    color: theme.colors.textLight,
    textAlign: 'center',
  }
});
