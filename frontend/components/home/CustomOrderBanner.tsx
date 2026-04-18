import React from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

export default function CustomOrderBanner() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const isMobile = width < 768;

  return (
    <View style={[styles.container, isMobile ? styles.containerMobile : styles.containerDesktop]}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>WANT SOMETHING MADE JUST FOR YOU?</Text>
        <Text style={styles.subtitle}>CTA — request a custom order from our makers</Text>
      </View>
      <Pressable
        style={styles.button}
        onPress={() => router.push('/customer-service')}
      >
        <Text style={styles.buttonText}>REQUEST CUSTOM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.lg,
  },
  containerMobile: {
    flexDirection: 'column',
    gap: theme.spacing.lg,
    textAlign: 'center',
  },
  containerDesktop: {
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold as any,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.primaryDark,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: theme.typography.weights.bold as any,
    letterSpacing: 1,
  }
});
