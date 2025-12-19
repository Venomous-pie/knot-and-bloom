import { AuthProvider } from "@/app/auth";
import { CartProvider } from "@/app/context/CartContext";
import CartAnimationOverlay from "@/components/CartAnimationOverlay";
import { fonts } from "@/constants/fonts";
import NavBar from "@/shared/Navbar";
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fonts);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <CartProvider>
        <View style={styles.container}>
          <NavBar />
          <CartAnimationOverlay />
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
