import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image, Animated } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ShoppingBag, Image as ImageIcon, Sparkles, Heart, Star } from 'lucide-react-native';

const HERO_IMAGES = [
  require('@/assets/hero-images/hero.jpeg'),
  require('@/assets/hero-images/hero1.jpeg'),
  require('@/assets/hero-images/hero2.jpeg'),
  require('@/assets/hero-images/hero3.jpeg'),
  require('@/assets/hero-images/hero4.jpeg'),
  require('@/assets/hero-images/hero5.jpeg'),
  require('@/assets/hero-images/hero6.jpeg'),
];

const Chain = ({ style }: { style: any }) => (
  <View style={[styles.chainWrapper, style]}>
    {Array.from({ length: 5 }).map((_, i) => (
      <View key={i} style={styles.chainLink} />
    ))}
    <View style={styles.chainPin} />
  </View>
);

export default function HeroSection() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Extremely subtle, slow sway animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setInterval(() => {
      // Smooth fade out
      Animated.timing(fadeAnim, {
        toValue: 0.5, // Don't fade entirely to black, just dip
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Swap image while faded
        setCurrentIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);

        // Smooth fade back in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(timer);
  }, []);

  const swayRotation = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-0.5deg', '0.5deg'] // Extremely subtle, barely noticeable sway
  });

  return (
    <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
      {/* Background Pattern */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: theme.borderRadius.lg }]} pointerEvents="none">
        <View style={{ position: 'absolute', top: -20, left: '5%', opacity: 0.03, transform: [{ rotate: '-15deg' }] }}>
          <Sparkles size={160} color={theme.colors.primary} />
        </View>
        <View style={{ position: 'absolute', bottom: -40, left: '25%', opacity: 0.04, transform: [{ rotate: '25deg' }] }}>
          <Heart size={200} color={theme.colors.secondary} />
        </View>
        <View style={{ position: 'absolute', top: '20%', right: '45%', opacity: 0.03, transform: [{ rotate: '45deg' }] }}>
          <Star size={120} color={theme.colors.primaryDark} />
        </View>
      </View>

      {/* Left Content */}
      <View style={[styles.contentSection, isMobile ? styles.contentMobile : styles.contentDesktop]}>
        <Text style={styles.headline}>Handmade things,{'\n'}heartfelt stories.</Text>
        <Text style={styles.tagline}>The kind of gift they'll actually keep.</Text>

        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed, hovered }: any) => [
              styles.button,
              styles.primaryButton,
              hovered && { backgroundColor: theme.colors.primaryDark, transform: [{ scale: 1.02 }] },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => router.push('/products/all-products' as any)}
          >
            <ShoppingBag size={18} color={theme.colors.surface} style={{ marginRight: theme.spacing.sm }} />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>SHOP NOW</Text>
          </Pressable>
          <Pressable
            style={({ pressed, hovered }: any) => [
              styles.button,
              styles.secondaryButton,
              hovered && { backgroundColor: theme.colors.subtle, transform: [{ scale: 1.02 }] },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => router.push('/customer-service')}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>CUSTOM ORDER</Text>
          </Pressable>
        </View>
      </View>

      {/* Right Content / Image Collage Slideshow */}
      <Animated.View style={[
        isMobile ? styles.imageMobile : styles.imageDesktop, 
        { 
          position: 'relative', 
          marginTop: isMobile ? theme.spacing.xl : 0,
          transform: [{ rotate: swayRotation }],
          transformOrigin: 'top center' as any
        }
      ]}>
        {!isMobile && (
          <>
            <Chain style={{ left: '20%' }} />
            <Chain style={{ right: '20%' }} />
          </>
        )}
        
        <View style={[styles.imageSection, { flex: 1, padding: 0, backgroundColor: '#000', width: '100%' }]}>
          <Animated.Image
            source={HERO_IMAGES[currentIndex]}
            style={[styles.image, { opacity: fadeAnim }]}
          />
          
          {/* Pagination Dots */}
          <View style={styles.dotsContainer}>
            {HERO_IMAGES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
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
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.4 }],
  },
  chainWrapper: {
    position: 'absolute',
    top: -50, // Extends up to the very top edge of the hero padding
    alignItems: 'center',
    zIndex: 10,
  },
  chainLink: {
    width: 14,
    height: 24,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: '#d1d5db', // Silver metallic color
    marginTop: -8, // Creates the linked overlap effect
  },
  chainPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9ca3af',
    marginTop: -4,
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.sm,
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
