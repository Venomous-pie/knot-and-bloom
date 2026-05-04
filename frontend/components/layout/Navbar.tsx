import { isMobile } from "@/constants/layout";
import '@/global.css';
import MenuSideBar from "@/components/layout/MenuSideBar";
import { Stack, usePathname } from "expo-router";
import React, { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import MobileTabBar from "./MobileTabBar";
import GlobalHeaderUI from "./GlobalHeaderUI";

export default function NavBar() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);

    const isBespokePage = pathname?.includes('/auth') ||
        pathname?.includes('/secure') ||
        pathname?.includes('/seller/apply') ||
        pathname?.includes('/seller/application-');

    const isSellerDashboard = pathname?.includes('/seller-dashboard');

    return (
        <View style={{ flex: 1 }}>
            <Stack
                screenOptions={{
                    headerTitleAlign: 'center',
                    headerShown: !isSellerDashboard,
                    header: () => (
                        <GlobalHeaderUI
                            setIsMenuOpen={setIsMenuOpen}
                            activeMenu={activeMenu}
                            setActiveMenu={setActiveMenu}
                        />
                    ),
                }}
            />
            <MenuSideBar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
            {mobile && !isBespokePage && <MobileTabBar />}
        </View >
    );
}
