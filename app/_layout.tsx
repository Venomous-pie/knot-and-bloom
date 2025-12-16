import NavBar from "@/shared/Navbar";
import * as SplashScreen from 'expo-splash-screen';
import React from "react";
import { StyleSheet, View } from "react-native";
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <NavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
