// Breakpoints for responsive design
export const BREAKPOINTS = {
    mobile: 1024,
    tablet: 1024,
} as const;

// Responsive margin values (as percentage of viewport width)
export const NAVBAR_MARGINS = {
    mobile: 0.05,   // 5% on mobile
    tablet: 0.08,   // 8% on tablet
    desktop: 0.1,   // 10% on desktop
} as const;

// Helper function to get responsive margin based on screen width
export const getNavbarMargin = (width: number): number => {
    if (width < BREAKPOINTS.mobile) {
        return NAVBAR_MARGINS.mobile;
    } else if (width < BREAKPOINTS.tablet) {
        return NAVBAR_MARGINS.tablet;
    }
    return NAVBAR_MARGINS.desktop;
};

// Helper to check if current screen is mobile
export const isMobile = (width: number): boolean => width < BREAKPOINTS.mobile;

// Helper to check if current screen is tablet
export const isTablet = (width: number): boolean =>
    width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;

// Helper to check if current screen is desktop
export const isDesktop = (width: number): boolean => width >= BREAKPOINTS.tablet;
