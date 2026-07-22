export const theme = {
  colors: {
    // Base / Background (60%)
    background: "#FCFAF9", // Warm Cream
    surface: "#FFFFFF",
    subtle: "#F3F4F6",
    backgroundAlt: "#F5F5F5", // Image placeholders, alt sections

    // Primary / Brand (30%)
    primary: "#B36979", // Dusty Pink
    primaryLight: "#E8D5D9", // Light Pink
    primaryDark: "#8F5461",
    primaryText: "#FFFFFF",

    // Accent (10%)
    secondary: "#567F4F", // Sage Green
    secondaryLight: "#567F4F20",

    // Neutral / Text
    text: "#1F2937", // Gray-900
    textSecondary: "#4B5563", // Gray-600
    textLight: "#9CA3AF", // Gray-400
    border: "#E5E7EB", // Gray-200
    shadow: "#000000", // Shadow color

    // Feedback
    error: "#EF4444",
    errorLight: "#FEF2F2",
    errorBorder: "#FECACA",
    errorDark: "#991B1B",
    success: "#10B981",
    warning: "#F59E0B",
    info: "#2196F3",
    infoLight: "#E3F2FD",

    // Badges (Product Cards)
    badgeTrending: "#FF6B6B",
    badgePopular: "#FF8C42",
    badgeLowStock: "#E0A800",
    badgePending: "#FFA000",

    // Ratings
    starGold: "#FFB800",

    // CTA
    ctaDark: "#222222",

    // Logo / Brand Marks (fixed, never themed)
    logoRed: "#dd1537ff",
    logoBlue: "#3785ebff",
    logoCyan: "#00c3ffff",

    // Order Status
    statusColors: {
      PENDING: { fg: "#8D6E63", bg: "#EFEBE9" }, // Soft Brown
      CONFIRMED: { fg: "#5C6BC0", bg: "#E8EAF6" }, // Soft Indigo
      PROCESSING: { fg: "#5C6BC0", bg: "#E8EAF6" },
      IN_PRODUCTION: { fg: "#7E57C2", bg: "#EDE7F6" }, // Soft Deep Purple
      READY_TO_SHIP: { fg: "#26A69A", bg: "#E0F2F1" }, // Soft Teal
      SHIPPED: { fg: "#7E57C2", bg: "#EDE7F6" },
      DELIVERED: { fg: "#66BB6A", bg: "#E8F5E9" }, // Soft Green
      COMPLETED: { fg: "#66BB6A", bg: "#E8F5E9" },
      CANCELLED: { fg: "#EF5350", bg: "#FFEBEE" }, // Soft Red
      REFUNDED: { fg: "#FF7043", bg: "#FBE9E7" }, // Soft Orange
      DISPUTED: { fg: "#FFA726", bg: "#FFF3E0" }, // Soft Amber
      DEFAULT: { fg: "#78909C", bg: "#ECEFF1" }, // Blue Grey
    },
  },

  typography: {
    fontFamily: "Quicksand", // If available, otherwise system default
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
      "3xl": 30,
    },
    weights: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
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
    "2xl": 48,
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};
