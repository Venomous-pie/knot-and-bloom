import { AuthProvider } from "@/app/auth";
import { CartProvider } from "@/app/context/CartContext";
import CartAnimationOverlay from "@/components/CartAnimationOverlay";
import NavBar from "@/shared/Navbar";
import * as SplashScreen from 'expo-splash-screen';
import React from "react";
import { StyleSheet, View } from "react-native";
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
