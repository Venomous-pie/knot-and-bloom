import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { CartProvider } from "@/contexts/CartContext";
import { CartAnimationProvider } from "@/contexts/CartAnimationContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { DialogProvider } from "@/contexts/DialogContext";
import { SellerSettingsProvider } from "@/contexts/SellerSettingsContext";
import AuthToast from "@/components/auth/AuthToast";
import GlobalToast from "@/components/ui/GlobalToast";
import CartAnimationOverlay from "@/components/cart/CartAnimationOverlay";
import OnboardingManager from "@/components/seller/OnboardingManager";
import GlobalAIChat from "@/components/layout/GlobalAIChat";
import { fonts } from "@/constants/fonts";
import NavBar from "@/components/layout/Navbar";
import CustomSplashScreen from "@/components/ui/SplashScreen";
import { Asset } from 'expo-asset';
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from "react";
import { VercelAnalytics } from "@/components/web/VercelAnalytics";
import { StyleSheet } from "react-native";
import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const providers = [
  AuthProvider,
  SocketProvider,
  CartProvider,
  CartAnimationProvider,
  WishlistProvider,
  DialogProvider,
  SellerSettingsProvider,
];

function ComposedProviders({ children }: { children: React.ReactNode }) {
  return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children) as React.ReactElement;
}

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
    // Intentionally empty. We hide the native splash screen earlier 
    // to show our CustomSplashScreen. This callback remains if we ever
    // need to run logic when the root view paints.
  }, [fontsLoaded, isReady]);

  if (!fontsLoaded || !isReady) {
    if (fontsLoaded) {
      // 1. Fonts are ready. Hide the native splash screen immediately.
      // 2. Render our <CustomSplashScreen /> which uses those fonts while we wait for assets.
      SplashScreen.hideAsync();
      return <CustomSplashScreen />;
    }
    // If fonts are NOT loaded yet, keep the native splash visible (return null)
    return null;
  }

  // App Ready
  return (
    <GestureHandlerRootView style={styles.container} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <ComposedProviders>
          <NavBar />
          <VercelAnalytics />
          <CartAnimationOverlay />
          <OnboardingManager />
          <AuthToast />
          <GlobalToast />
          <GlobalAIChat />
        </ComposedProviders>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
