import { useCart } from '@/app/context/CartContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// Approximate position of the cart icon in the Navbar
// This is a simplification; for pixel-perfect accuracy we'd measure the icon position.
// Assuming Navbar is fixed at top, icon is roughly 50px from right, 25px from top.
const CART_ICON_TARGET = {
    x: width - 80, // Moved left to match icon position better
    y: 40 // Adjusted vertical position
};

export default function CartAnimationOverlay() {
    const { animationStartPos, clearAnimation, cartIconPosition } = useCart();
    const animatedValue = useRef(new Animated.Value(0)).current;

    const targetPos = cartIconPosition || CART_ICON_TARGET;

    useEffect(() => {
        if (animationStartPos) {
            animatedValue.setValue(0);

            Animated.timing(animatedValue, {
                toValue: 1,
                duration: 800,
                // easing: Easing.bezier(0.16, 1, 0.3, 1), // Optional: mimic CSS ease-out-expo
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    clearAnimation();
                }
            });
        }
    }, [animationStartPos]);

    if (!animationStartPos) return null;

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [animationStartPos.x, targetPos.x],
    });

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [animationStartPos.y, targetPos.y],
    });

    const scale = animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 1.2, 0.5],
    });

    const opacity = animatedValue.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [1, 1, 0],
    });

    return (
        <View style={styles.overlay} pointerEvents="none">
            <Animated.View
                style={[
                    styles.flyingItem,
                    {
                        transform: [
                            { translateX },
                            { translateY },
                            { scale }
                        ],
                        opacity
                    }
                ]}
            >
                <Ionicons name="cube" size={24} color="#B36979" />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999, // Android
        justifyContent: 'flex-start',
        alignItems: 'flex-start', // Important so translation starts from 0,0
    },
    flyingItem: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 30,
        height: 30,
        backgroundColor: '#FCE7F3', // Light pink background
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    }
});
