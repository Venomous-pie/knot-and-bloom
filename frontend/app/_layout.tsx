import { AuthProvider } from "@/app/auth";
import { CartProvider } from "@/app/context/CartContext";
import AuthToast from "@/components/AuthToast";
import CartAnimationOverlay from "@/components/CartAnimationOverlay";
import OnboardingManager from "@/components/OnboardingManager";
import { fonts } from "@/constants/fonts";
import NavBar from "@/shared/Navbar";
import CustomSplashScreen from "@/shared/SplashScreen";
import { Asset } from 'expo-asset';
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fonts);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const imageAssets = [
          require('@/assets/yarn.png'),
        ];

        const imagePromises = imageAssets.map(image => {
          return Asset.fromModule(image).downloadAsync();
        });

        await Promise.all([...imagePromises]);

      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && isReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isReady]);

  useEffect(() => {
    // Hide the native splash screen as soon as we render our wrapper
    // This allows our CustomSplashScreen to be visible immediately.
    // However, preventAutoHideAsync is active. We should hide it ONLY when we are ready to show *something* 
    // which is our CustomSplashScreen.
    if (!fontsLoaded && !isReady) {
      // Keep native splash? Or hide it and show ours?
      // If we show ours, we need fonts for "Lovingly".
      // So we must wait for FONTS to show our Custom Splash if it uses text.
      // BUT, we want to show *something*. 
      // Strategy: Wait for fonts (usually fast) -> Hide Native -> Show Custom -> Load Assets -> Show App.
      // IF fonts take long, user sees Native Splash.
    }
  }, []);

  if (!fontsLoaded || !isReady) {
    // If fonts are loaded, we can show our Custom Splash which uses those fonts.
    if (fontsLoaded) {
      // Hide native splash so ours is visible
      SplashScreen.hideAsync();
      return <CustomSplashScreen />;
    }
    // If fonts NOT loaded, keep Native Splash visible (return null)
    return null;
  }

  // App Ready
  return (
    <AuthProvider>
      <CartProvider>
        <View style={styles.container} onLayout={onLayoutRootView}>
          <NavBar />
          <CartAnimationOverlay />
          <OnboardingManager />
          <AuthToast />
        </View>
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
