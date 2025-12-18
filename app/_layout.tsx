import { AuthProvider } from "@/app/auth";
import NavBar from "@/shared/Navbar";
import * as SplashScreen from 'expo-splash-screen';
import React from "react";
import { StyleSheet, View } from "react-native";
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <NavBar />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
