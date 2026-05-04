import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Placeholder for the asset - ensure this path is correct based on your project structure
const YARN_IMAGE = require('@/assets/yarn.png');

export default function SplashScreen() {
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);
    const progress = useSharedValue(0);

    useEffect(() => {
        // Spin animation
        rotation.value = withRepeat(
            withTiming(360, { duration: 20000, easing: Easing.linear }),
            -1,
            false
        );

        // Pulse animation
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Fade in content
        opacity.value = withTiming(1, { duration: 800 });

        // Progress bar animation
        progress.value = withTiming(100, { duration: 3000, easing: Easing.out(Easing.exp) });
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { rotate: `${rotation.value}deg` },
                { scale: scale.value },
            ],
        };
    });

    const animatedOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const progressStyle = useAnimatedStyle(() => {
        return {
            width: `${progress.value}%`,
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                {/* Animated Logo */}
                <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
                    <Image
                        source={YARN_IMAGE}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Brand Name */}
                <Animated.View style={animatedOpacityStyle}>
                    <Text style={styles.brandName}>Knot&Bloom</Text>
                    <Text style={styles.tagline}>Handcrafted with love</Text>
                </Animated.View>

                {/* Progress Bar */}
                <Animated.View style={[styles.progressContainer, animatedOpacityStyle]}>
                    <View style={styles.progressBarBackground}>
                        <Animated.View style={[styles.progressBarFill, progressStyle]} />
                    </View>
                    <Text style={styles.loadingText}>Loading...</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF5F7', // Soft pink background
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 20,
    },
    logoContainer: {
        marginBottom: 24,
        backgroundColor: 'transparent', // Make sure no background color
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        backgroundColor: 'transparent', // Ensure transparent background
    },
    brandName: {
        fontSize: 40,
        fontWeight: '600',
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
        fontFamily: 'Lovingly',
    },
    tagline: {
        fontSize: 16,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 40,
        fontStyle: 'italic',
    },
    progressContainer: {
        width: 200,
        alignItems: 'center',
    },
    progressBarBackground: {
        width: '100%',
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#E11D48',
        borderRadius: 2,
    },
    loadingText: {
        fontSize: 12,
        color: '#A0AEC0',
        fontWeight: '500',
    },
});