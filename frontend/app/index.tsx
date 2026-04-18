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
import { useAuth } from "@/app/auth";
import { theme } from "@/constants/theme";

// Import Home Components
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import BestsellersSection from "@/components/home/BestsellersSection";
import CustomOrderBanner from "@/components/home/CustomOrderBanner";
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
          <CategoriesSection />
          <BestsellersSection />
          <CustomOrderBanner />
          <Footer />
        </View>
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