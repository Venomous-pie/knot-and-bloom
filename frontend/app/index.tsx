import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { theme } from "@/constants/theme";

// Import Home Components
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import BestsellersSection from "@/components/home/BestsellersSection";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";
import CustomOrderBanner from "@/components/home/CustomOrderBanner";
import RecommendationsSection from "@/components/home/RecommendationsSection";
import Footer from "@/components/home/Footer";

export default function Index() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageWrapper}>
          <HeroSection />
          <RecommendationsSection />
          <CategoriesSection />
          <NewArrivalsSection />
          <BestsellersSection />
          <CustomOrderBanner />
        </View>
        <Footer />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  pageWrapper: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    gap: theme.spacing.sm,
  },
});