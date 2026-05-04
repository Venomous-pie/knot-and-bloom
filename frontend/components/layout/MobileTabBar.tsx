import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Home, LayoutGrid, Heart, Bell, UserRound } from 'lucide-react-native';
import { usePathname, router, RelativePathString } from 'expo-router';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        height: 60,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100, // Ensure it sits on top if needed, though flex layout is preferred
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    activeTab: {
        color: '#B36979',
    },
    inactiveTab: {
        color: '#999',
    },
});

export default function MobileTabBar() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname?.startsWith(path);
    };

    const tabs = [
        {
            name: 'Shop',
            icon: LayoutGrid,
            path: '/products/all-products' as RelativePathString,
            activeColor: '#B36979',
        },
        {
            name: 'Wishlist',
            icon: Heart,
            path: '/wishlist' as RelativePathString,
            activeColor: '#B36979',
        },
        {
            name: 'Home',
            icon: Home,
            path: '/' as RelativePathString,
            activeColor: '#B36979',
            isMain: true,
        },
        {
            name: 'Notifications',
            icon: Bell,
            path: '/notifications' as RelativePathString, // Assuming this route, or we can make it a dummy
            activeColor: '#B36979',
        },
        {
            name: 'Profile',
            icon: UserRound,
            path: '/profile' as RelativePathString,
            activeColor: '#B36979',
        },
    ];

    return (
        <View style={styles.container}>
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const active = isActive(tab.path);

                return (
                    <Pressable
                        key={index}
                        style={styles.tabItem}
                        onPress={() => router.push(tab.path)}
                    >
                        <Icon
                            size={24}
                            color={active ? tab.activeColor : '#999'}
                            strokeWidth={active ? 2.5 : 2}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
}
