import { ProfileMenu } from '@/components/profile/ProfileMenu';
import { Slot, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions, Platform } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    Easing
} from 'react-native-reanimated';

export default function ProfileLayout() {
    const pathname = usePathname();
    const { width } = useWindowDimensions();

    const isRoot = pathname === '/profile' || pathname === '/profile/';
    const isMobile = width < 768;

    // Animation values
    // 0 = Root State (Menu Full), 1 = Child State (Menu Side, Content Visible)
    const progress = useSharedValue(isRoot ? 0 : 1);

    useEffect(() => {
        progress.value = withSpring(isRoot ? 0 : 1, {
            damping: 20,
            stiffness: 100,
            mass: 1
        });
    }, [isRoot]);

    const menuStyle = useAnimatedStyle(() => {
        const flex = isMobile
            ? withTiming(isRoot ? 1 : 0, { duration: 300, easing: Easing.out(Easing.exp) })
            : withTiming(isRoot ? 1 : 0.3, { duration: 300, easing: Easing.out(Easing.exp) });

        const opacity = isMobile && !isRoot
            ? withTiming(0, { duration: 200 })
            : withTiming(1, { duration: 300 });

        return {
            flex: flex,
            opacity: opacity,
            maxWidth: isRoot ? '100%' : 400,
            display: (isMobile && !isRoot && progress.value > 0.9) ? 'none' : 'flex'
        };
    });

    const contentStyle = useAnimatedStyle(() => {
        const flex = withTiming(isRoot ? 0 : 1, { duration: 300, easing: Easing.out(Easing.exp) });
        const opacity = withTiming(isRoot ? 0 : 1, { duration: 300 });
        // Removed translateX to stabilize content origin

        return {
            flex: flex,
            opacity: opacity,
            display: (isRoot && progress.value < 0.1) ? 'none' : 'flex'
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.menuContainer, menuStyle]}>
                <ProfileMenu style={styles.menu} />
            </Animated.View>

            <Animated.View style={[styles.contentContainer, contentStyle]}>
                <Slot />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F9F9F9',
        maxWidth: 1600,
        marginHorizontal: 'auto',
        width: '100%',
    },
    menuContainer: {
        height: '100%',
        overflow: 'hidden',
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
        backgroundColor: 'white',
        zIndex: 10,
    },
    menu: {
        flex: 1,
    },
    contentContainer: {
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#FAFAFA',
    },
});
