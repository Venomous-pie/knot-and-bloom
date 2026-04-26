import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Scissors } from 'lucide-react-native';

export default function CustomOrderBanner() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 768;
  
  return (
    <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
      {/* Left Column: Image */}
      <View style={[styles.imageSection, isMobile ? styles.imageMobile : styles.imageDesktop]}>
        <Image 
          source={require('@/assets/banner.jpeg')} 
          style={styles.image} 
        />
      </View>

      {/* Right Column: Editorial Text Block */}
      <View style={[styles.textSection, isMobile ? styles.textMobile : styles.textDesktop]}>
        <View style={styles.textContent}>
          <Text style={styles.title}>WANT SOMETHING MADE JUST FOR YOU?</Text>
          <Text style={styles.subtitle}>
            Work directly with our student makers to bring your unique ideas to life. From custom plushies to personalized floral arrangements.
          </Text>
          
          <Pressable 
            style={({ pressed, hovered }: any) => [
              styles.button,
              hovered && { backgroundColor: theme.colors.subtle, transform: [{ scale: 1.02 }] },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
            onPress={() => router.push('/customer-service')}
          >
            <Text style={styles.buttonText}>REQUEST CUSTOM ORDER</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing['2xl'],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  containerMobile: {
    flexDirection: 'column',
  },
  containerDesktop: {
    flexDirection: 'row',
    minHeight: 400,
  },
  // Left Column Styles
  imageSection: {
    backgroundColor: theme.colors.backgroundAlt,
  },
  imageMobile: {
    width: '100%',
    height: 250,
  },
  imageDesktop: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Right Column Styles
  textSection: {
    backgroundColor: theme.colors.primaryDark,
    justifyContent: 'center',
  },
  textMobile: {
    padding: theme.spacing.xl,
  },
  textDesktop: {
    flex: 1,
    padding: theme.spacing['2xl'],
  },
  textContent: {
    maxWidth: 400,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.surface,
    marginBottom: theme.spacing.md,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primaryLight,
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  button: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.weights.bold as any,
    letterSpacing: 1,
    fontSize: theme.typography.sizes.sm,
  }
});
