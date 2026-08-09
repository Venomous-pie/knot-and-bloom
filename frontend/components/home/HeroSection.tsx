import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Animated, Image } from 'react-native';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ShoppingBag, Star, ShieldCheck, Heart, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HERO_IMAGES } from '@/assets/hero-images';

export default function HeroSection() {
    const { width } = useWindowDimensions();
    const isMobile = width < 1024;
    const router = useRouter();

    const [images] = useState(() => {
        const shuffled = [...HERO_IMAGES].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    });

    // Animations
    const fadeAnim1 = useRef(new Animated.Value(0)).current;
    const fadeAnim2 = useRef(new Animated.Value(0)).current;
    const fadeAnim3 = useRef(new Animated.Value(0)).current;
    const fadeAnim4 = useRef(new Animated.Value(0)).current;
    
    const drop1 = useRef(new Animated.Value(-50)).current;
    const drop2 = useRef(new Animated.Value(-50)).current;
    const drop3 = useRef(new Animated.Value(-50)).current;
    const polaroidOpacity1 = useRef(new Animated.Value(0)).current;
    const polaroidOpacity2 = useRef(new Animated.Value(0)).current;
    const polaroidOpacity3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Text fade in sequence
        Animated.stagger(200, [
            Animated.timing(fadeAnim1, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(fadeAnim2, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(fadeAnim3, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(fadeAnim4, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();

        if (!isMobile) {
            // Polaroid drop stagger
            Animated.stagger(250, [
                Animated.parallel([
                    Animated.spring(drop1, { toValue: 0, tension: 50, friction: 6, useNativeDriver: true }),
                    Animated.timing(polaroidOpacity1, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.spring(drop2, { toValue: 0, tension: 50, friction: 6, useNativeDriver: true }),
                    Animated.timing(polaroidOpacity2, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.spring(drop3, { toValue: 0, tension: 50, friction: 6, useNativeDriver: true }),
                    Animated.timing(polaroidOpacity3, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]),
            ]).start();
        } else {
             Animated.parallel([
                Animated.spring(drop1, { toValue: 0, tension: 50, friction: 6, useNativeDriver: true }),
                Animated.timing(polaroidOpacity1, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start();
        }
    }, [isMobile]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FCFAF9', '#F9F0F2']}
                style={StyleSheet.absoluteFill}
            />
            
            <View style={[styles.contentWrapper, isMobile ? styles.contentWrapperMobile : styles.contentWrapperDesktop]}>
                
                {/* Left Panel */}
                <View style={[styles.leftPanel, isMobile && styles.leftPanelMobile]}>
                    <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                         <Text style={[styles.headline, isMobile && styles.headlineMobile]}>
                            Handmade things,
                         </Text>
                    </Animated.View>
                    <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                         <Text style={[styles.headline, isMobile && styles.headlineMobile, { color: theme.colors.primary }]}>
                            heartfelt stories.
                         </Text>
                    </Animated.View>
                    <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                        <Text style={[styles.tagline, isMobile && styles.taglineMobile]}>
                            The kind of gift they'll actually keep.
                        </Text>
                    </Animated.View>
                    
                    <Animated.View style={[styles.actions, isMobile && styles.actionsMobile, { opacity: fadeAnim4 }]}>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.primaryBtn,
                                hovered && { backgroundColor: theme.colors.primaryDark, transform: [{ translateY: -2 }] },
                                pressed && { transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => router.push('/products/all-products' as any)}
                        >
                            <ShoppingBag size={18} color="white" />
                            <Text style={styles.primaryBtnText}>SHOP NOW</Text>
                        </Pressable>
                        <Pressable 
                            style={({ pressed, hovered }: any) => [
                                styles.outlineBtn,
                                hovered && { backgroundColor: theme.colors.primaryLight, transform: [{ translateY: -2 }] },
                                pressed && { transform: [{ scale: 0.98 }] }
                            ]}
                            onPress={() => router.push('/makers' as any)}
                        >
                            <Text style={styles.outlineBtnText}>CUSTOM ORDER</Text>
                        </Pressable>
                    </Animated.View>

                    {/* Trust badges */}
                    <Animated.View style={[styles.trustStrip, { opacity: fadeAnim4 }]}>
                        <View style={styles.trustItem}>
                            <Heart size={16} color={theme.colors.primary} />
                            <Text style={styles.trustText}>Handcrafted</Text>
                        </View>
                        <View style={styles.trustItem}>
                            <Users size={16} color={theme.colors.primary} />
                            <Text style={styles.trustText}>Filipino Makers</Text>
                        </View>
                        <View style={styles.trustItem}>
                            <ShieldCheck size={16} color={theme.colors.primary} />
                            <Text style={styles.trustText}>Secure Checkout</Text>
                        </View>
                    </Animated.View>
                </View>

                {/* Right Panel */}
                <View style={[styles.rightPanel, isMobile && styles.rightPanelMobile]}>
                    {!isMobile ? (
                        <View style={styles.collageContainer}>
                            {/* Card 3 (Back) */}
                            <Animated.View style={[styles.polaroid, styles.polaroid3, { opacity: polaroidOpacity3, transform: [{ translateY: drop3 }, { rotate: '8deg' }] }]}>
                                <Image source={images[2]} style={styles.polaroidImage} />
                            </Animated.View>
                            {/* Card 2 (Middle) */}
                            <Animated.View style={[styles.polaroid, styles.polaroid2, { opacity: polaroidOpacity2, transform: [{ translateY: drop2 }, { rotate: '-6deg' }] }]}>
                                <Image source={images[1]} style={styles.polaroidImage} />
                            </Animated.View>
                            {/* Card 1 (Front) */}
                            <Animated.View style={[styles.polaroid, styles.polaroid1, { opacity: polaroidOpacity1, transform: [{ translateY: drop1 }, { rotate: '2deg' }] }]}>
                                <Image source={images[0]} style={styles.polaroidImage} />
                            </Animated.View>
                            
                            {/* Social Proof Pill */}
                            <Animated.View style={[styles.socialPill, { opacity: polaroidOpacity1 }]}>
                                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.socialText}><Text style={{fontWeight: '700'}}>4.8</Text> · 2,000+ handmade items</Text>
                            </Animated.View>
                        </View>
                    ) : (
                        <View style={styles.mobileImageContainer}>
                            <Animated.View style={[styles.polaroid, { opacity: polaroidOpacity1, transform: [{ translateY: drop1 }] }]}>
                                <Image source={images[0]} style={styles.polaroidImage} />
                            </Animated.View>
                            <Animated.View style={[styles.socialPill, styles.socialPillMobile, { opacity: polaroidOpacity1 }]}>
                                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                                <Text style={styles.socialText}><Text style={{fontWeight: '700'}}>4.8</Text> · 2,000+ items</Text>
                            </Animated.View>
                        </View>
                    )}
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        minHeight: 600,
        overflow: 'hidden',
    },
    contentWrapper: {
        flex: 1,
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 24,
    },
    contentWrapperDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 80,
    },
    contentWrapperMobile: {
        flexDirection: 'column',
        paddingVertical: 40,
        paddingHorizontal: 16,
    },
    leftPanel: {
        flex: 1,
        zIndex: 10,
    },
    leftPanelMobile: {
        alignItems: 'center',
        marginBottom: 40,
    },
    headline: {
        fontSize: 56,
        fontWeight: '700',
        fontFamily: 'Quicksand',
        color: '#1A1A2E',
        lineHeight: 64,
        letterSpacing: -1,
    },
    headlineMobile: {
        fontSize: 40,
        lineHeight: 48,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 20,
        fontFamily: 'Quicksand',
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 32,
    },
    taglineMobile: {
        fontSize: 18,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 48,
    },
    actionsMobile: {
        flexDirection: 'column',
        width: '100%',
        alignItems: 'center',
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 3,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        fontFamily: 'Quicksand',
        letterSpacing: 0.5,
    },
    outlineBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineBtnText: {
        color: theme.colors.primary,
        fontWeight: '700',
        fontSize: 15,
        fontFamily: 'Quicksand',
        letterSpacing: 0.5,
    },
    trustStrip: {
        flexDirection: 'row',
        gap: 24,
        flexWrap: 'wrap',
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trustText: {
        fontSize: 13,
        fontFamily: 'Quicksand',
        fontWeight: '600',
        color: '#4B5563',
    },
    rightPanel: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
    },
    rightPanelMobile: {
        width: '100%',
    },
    collageContainer: {
        width: 400,
        height: 400,
        position: 'relative',
    },
    polaroid: {
        backgroundColor: 'white',
        padding: 12,
        paddingBottom: 40,
        borderRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    polaroidImage: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
        resizeMode: 'cover',
    },
    polaroid1: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 260,
        height: 320,
        zIndex: 3,
    },
    polaroid2: {
        position: 'absolute',
        top: -10,
        left: 120,
        width: 240,
        height: 290,
        zIndex: 2,
    },
    polaroid3: {
        position: 'absolute',
        top: 60,
        left: 160,
        width: 220,
        height: 270,
        zIndex: 1,
    },
    mobileImageContainer: {
        width: '100%',
        aspectRatio: 0.8,
        position: 'relative',
        alignItems: 'center',
    },
    socialPill: {
        position: 'absolute',
        bottom: 10,
        left: -30,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        zIndex: 10,
    },
    socialPillMobile: {
        bottom: -20,
        left: 20,
    },
    socialText: {
        fontSize: 13,
        fontFamily: 'Quicksand',
        color: '#4B5563',
    },
});
