export const theme = {
    colors: {
        // Base / Background (60%)
        background: '#FCFAF9', // Warm Cream
        surface: '#FFFFFF',
        subtle: '#F3F4F6',

        // Primary / Brand (30%)
        primary: '#B36979', // Dusty Pink
        primaryLight: '#E8D5D9', // Light Pink
        primaryDark: '#8F5461',
        primaryText: '#FFFFFF',

        // Accent (10%)
        secondary: '#567F4F', // Sage Green
        secondaryLight: '#567F4F20',

        // Neutral / Text
        text: '#1F2937',     // Gray-900
        textSecondary: '#4B5563', // Gray-600
        textLight: '#9CA3AF', // Gray-400
        border: '#E5E7EB',   // Gray-200

        // Feedback
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
    },
    typography: {
        fontFamily: 'Quicksand', // If available, otherwise system default
        sizes: {
            xs: 12,
            sm: 14,
            base: 16,
            lg: 18,
            xl: 20,
            '2xl': 24,
            '3xl': 30,
        },
        weights: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        }
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        full: 9999,
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        '2xl': 48,
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 4,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
        }
    }
};
