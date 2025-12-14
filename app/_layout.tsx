import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Link, RelativePathString, Stack, usePathname } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { Pressable, StyleSheet, Image, Text, View } from "react-native";
import '../global.css';
import { Heart, UserRound, Menu } from "lucide-react-native";
import DropdownMenu from "../shared/DropdownMenu";
import MenuSideBar from "@/shared/MenuSideBar";

SplashScreen.preventAutoHideAsync();

const styles = StyleSheet.create({
  iconHovered: {
    backgroundColor: '#B36979',
    borderRadius: 5,
    padding: 5,
    color: 'white',
  },

  navlinkContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  underline: {
    height: 2,
    backgroundColor: '#B36979',
    marginTop: 4,
    width: 0,
    // @ts-ignore
    transition: 'width 0.3s ease',
  },

  underlineHovered: {
    width: '100%',
  },

  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  navlinkButton: {
    fontFamily: 'Montserrat-Regular',
  },

})

const navLinks: { title: string, href: RelativePathString }[] = [
  { title: 'Home', href: "/" as RelativePathString },
  { title: 'Popular', href: "/products/popular" as RelativePathString },
  { title: 'New Arrivals', href: "/products/new-arrival" as RelativePathString },
  { title: 'Crochet', href: '/products/crochet' as RelativePathString },
  { title: 'Fuzzy Wire Art', href: "/products/fuzzy-wire-art" as RelativePathString },
  { title: 'Accessories', href: "/products/accessories" as RelativePathString },
]

function NavLinks() {
  const pathname = usePathname();

  return (
    <View style={{ flexDirection: 'row', gap: 35 }}>
      {navLinks.slice(0, 3).map((link) => {
        const isActive = pathname === link.href;

        return ((
          <Link key={link.title} href={link.href} asChild>
            <Pressable style={styles.navlinkContainer}>
              {({ hovered }) => {
                return (
                  <>
                    <Text>{link.title}</Text>
                    <View style={[styles.underline, (hovered || isActive) && styles.underlineHovered]} />
                  </>
                );
              }}
            </Pressable>
          </Link>
        ));
      })}
      {navLinks.length > 3 && (
        <DropdownMenu links={navLinks.slice(3)} />
      )}
    </View>
  );
}

function SideMenu() {
  return (
    <View>
      test
      <MenuSideBar />
    </View>
  );
}

export default function RootLayout() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const [fontsLoaded] = useFonts({
    'Lovingly': require('../assets/fonts/Lovingly/Lovingly.otf'),
    'Montserrat-Regular': require('../assets/fonts/Montserrat/static/Montserrat-Black.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerTitleAlign: 'center',
          headerShown: true,
          headerLeft: () => {
            return (
              <View style={{ flexDirection: 'row', gap: 0, alignItems: 'center', marginLeft: visualViewport?.width! * 0.1 }}>
                <Image source={require('../assets/yarn.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                <Text style={{ fontFamily: 'Lovingly', color: '#B36979', marginTop: 10, fontWeight: 'bold' }}>Knot</Text>
                <Text style={{ fontFamily: 'Lovingly', color: '#567F4F', marginTop: 10, fontWeight: 'bold' }}>&Bloom</Text>
              </View>
            );
          },
          headerTitle: () => <NavLinks />,
          headerRight: () => {
            return (
              <View style={{ marginRight: visualViewport?.width! * 0.1, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Pressable
                  onPress={() => alert("Wishlist Page")}
                  style={({ hovered }) => [
                    styles.iconButton,
                    hovered && styles.iconHovered,
                  ]}
                >
                  <Heart size={18} />
                </Pressable>

                <Pressable
                  onPress={() => alert("Profile Page")}
                  style={({ hovered }) => [
                    styles.iconButton,
                    hovered && styles.iconHovered,
                  ]}
                >
                  <UserRound size={18} />
                </Pressable>
                <Pressable
                  onPress={() => setIsMenuOpen(true)}
                  style={({ hovered }) => [
                    styles.iconButton,
                    hovered && styles.iconHovered,
                  ]}
                >
                  <Menu size={18} />
                </Pressable>
              </View>
            );
          },
        }}
      />
      {isMenuOpen && <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}  />}
    </>
  );

}
