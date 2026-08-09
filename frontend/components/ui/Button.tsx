import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps, StyleProp, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';

export interface ButtonProps extends PressableProps {
  /** Text to display inside the button */
  title: string;
  /** Visual style variant of the button */
  variant?: 'primary' | 'outline' | 'danger';
  /** Optional icon component to display */
  icon?: React.ReactNode;
  /** Whether the button is in a loading state (shows spinner) */
  loading?: boolean;
  /** Override container styles */
  style?: StyleProp<ViewStyle>;
  /** Override text styles */
  textStyle?: StyleProp<TextStyle>;
  /** Whether the button spans the full width of its container */
  fullWidth?: boolean;
  /** Position of the icon relative to the text */
  iconPosition?: 'left' | 'right';
}

/**
 * Centralized Button component for Knot & Bloom.
 * Based on the Hero Section design tokens.
 */
export default function Button({
  title,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
  iconPosition = 'left',
  ...props
}: ButtonProps) {
  
  const getContainerStyles = (pressed: boolean, hovered: boolean) => {
    const baseStyle: any[] = [styles.baseBtn, fullWidth && { width: '100%' as any }];
    
    // Variant specific styles
    if (variant === 'primary') {
      baseStyle.push(styles.primaryBtn);
      if (hovered && !disabled) baseStyle.push({ backgroundColor: theme.colors.primaryDark, transform: [{ translateY: -2 }] } as any);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outlineBtn);
      if (hovered && !disabled) baseStyle.push({ backgroundColor: theme.colors.primaryLight, transform: [{ translateY: -2 }] } as any);
    } else if (variant === 'danger') {
      baseStyle.push(styles.dangerBtn);
      if (hovered && !disabled) baseStyle.push({ backgroundColor: '#DC2626', transform: [{ translateY: -2 }] } as any);
    }

    // Interaction states
    if (pressed && !disabled) {
      baseStyle.push({ transform: [{ scale: 0.98 }] } as any);
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.push(styles.disabledBtn);
    }

    return [baseStyle, style];
  };

  const getTextStyles = () => {
    if (variant === 'outline') return [styles.outlineBtnText, textStyle];
    return [styles.primaryBtnText, textStyle];
  };

  // Determine spinner color based on variant
  const getSpinnerColor = () => {
    if (variant === 'outline') return theme.colors.primary;
    return 'white';
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed, hovered }: any) => getContainerStyles(pressed, hovered)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} style={{ marginRight: 8 }} />
      ) : (
        icon && iconPosition === 'left' && icon
      )}
      <Text style={getTextStyles()}>{title}</Text>
      {!loading && icon && iconPosition === 'right' && icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // Add smooth transition for web
    //@ts-ignore - web only
    transitionProperty: 'background-color, transform',
    //@ts-ignore - web only
    transitionDuration: '0.2s',
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Quicksand',
    letterSpacing: 0.5,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  outlineBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Quicksand',
    letterSpacing: 0.5,
  },
  dangerBtn: {
    backgroundColor: theme.colors.error || '#EF4444',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
