import React, { useEffect, useRef } from 'react';
import * as ExpoSplashScreen from 'expo-splash-screen';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const YARN_IMAGE = require('@/assets/yarn.png');

// ─── Brand colours (no raw hex outside this block) ──────────────────────────
const PRIMARY    = '#B36979';   // Dusty Pink
const PRIMARY_LT = '#E8D5D9';   // Light Pink
const SECONDARY  = '#567F4F';   // Sage Green
const BG         = '#FCFAF9';   // Warm Cream
const TEXT_MAIN  = '#1F2937';
const TEXT_MUTED = '#9CA3AF';

// ─── Falling petal particle ──────────────────────────────────────────────────
interface PetalProps { delay: number; startX: number; size: number; color: string; }

function Petal({ delay, startX, size, color }: PetalProps) {
    const y      = useRef(new Animated.Value(-size * 2)).current;
    const opac   = useRef(new Animated.Value(0)).current;
    const rot    = useRef(new Animated.Value(0)).current;
    const swayX  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const run = () => {
            y.setValue(-size * 2);
            opac.setValue(0);
            rot.setValue(0);
            swayX.setValue(0);

            const duration = 7000 + Math.random() * 4000;

            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(y, { toValue: height + size * 2, duration, easing: Easing.linear, useNativeDriver: false }),
                    Animated.sequence([
                        Animated.timing(opac, { toValue: 0.75, duration: 500, useNativeDriver: false }),
                        Animated.timing(opac, { toValue: 0.75, duration: duration - 1000, useNativeDriver: false }),
                        Animated.timing(opac, { toValue: 0, duration: 500, useNativeDriver: false }),
                    ]),
                    Animated.loop(Animated.sequence([
                        Animated.timing(rot, { toValue: 1, duration: 2200, easing: Easing.ease, useNativeDriver: false }),
                        Animated.timing(rot, { toValue: -1, duration: 2200, easing: Easing.ease, useNativeDriver: false }),
                    ])),
                    Animated.loop(Animated.sequence([
                        Animated.timing(swayX, { toValue: 14, duration: 1600, easing: Easing.ease, useNativeDriver: false }),
                        Animated.timing(swayX, { toValue: -14, duration: 1600, easing: Easing.ease, useNativeDriver: false }),
                    ])),
                ]),
            ]).start(() => run());
        };
        run();
    }, []);

    const rotation = rot.interpolate({ inputRange: [-1, 1], outputRange: ['-50deg', '50deg'] });

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: startX,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: opac,
                transform: [{ translateY: y }, { translateX: swayX }, { rotate: rotation }],
            }}
        />
    );
}

const PETALS: PetalProps[] = [
    { delay: 0,    startX: width * 0.07, size: 10, color: '#E8A0B0' },
    { delay: 700,  startX: width * 0.20, size: 7,  color: '#C9A0DC' },
    { delay: 200,  startX: width * 0.36, size: 9,  color: PRIMARY },
    { delay: 1100, startX: width * 0.52, size: 6,  color: PRIMARY_LT },
    { delay: 500,  startX: width * 0.67, size: 11, color: `${SECONDARY}60` },
    { delay: 50,   startX: width * 0.80, size: 8,  color: '#E8A0B0' },
    { delay: 1400, startX: width * 0.91, size: 7,  color: PRIMARY },
    { delay: 350,  startX: width * 0.14, size: 6,  color: '#C9A0DC' },
    { delay: 850,  startX: width * 0.44, size: 10, color: PRIMARY_LT },
    { delay: 150,  startX: width * 0.73, size: 8,  color: '#E8A0B0' },
];

// ─── Main splash ─────────────────────────────────────────────────────────────
interface SplashScreenProps {
    onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
    // Logo
    const logoScale   = useRef(new Animated.Value(0.55)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoFloat   = useRef(new Animated.Value(0)).current;

    // Pulse ring
    const ringScale   = useRef(new Animated.Value(1)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;

    // Text
    const titleOpacity   = useRef(new Animated.Value(0)).current;
    const titleY         = useRef(new Animated.Value(14)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const taglineY       = useRef(new Animated.Value(10)).current;

    // Progress
    const barOpacity = useRef(new Animated.Value(0)).current;
    const barWidth   = useRef(new Animated.Value(0)).current;
    const shimmerX   = useRef(new Animated.Value(-80)).current;

    // Footer
    const footerOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        ExpoSplashScreen.hideAsync();

        // ── Logo & ring entrance ─────────────────────────────────────────
        Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: false }),
            Animated.timing(logoOpacity, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }),
            Animated.timing(ringOpacity, { toValue: 0.55, duration: 900, useNativeDriver: false }),
        ]).start();

        // ── Title ────────────────────────────────────────────────────────
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: false }),
                Animated.timing(titleY, { toValue: 0, duration: 500, easing: Easing.ease, useNativeDriver: false }),
            ]).start();
        }, 350);

        // ── Tagline ──────────────────────────────────────────────────────
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: false }),
                Animated.timing(taglineY, { toValue: 0, duration: 500, easing: Easing.ease, useNativeDriver: false }),
            ]).start();
        }, 550);

        // ── Progress bar ─────────────────────────────────────────────────
        setTimeout(() => {
            Animated.timing(barOpacity, { toValue: 1, duration: 300, useNativeDriver: false }).start();
            Animated.timing(barWidth, { toValue: 180, duration: 2800, easing: Easing.ease, useNativeDriver: false }).start();
            Animated.loop(
                Animated.timing(shimmerX, { toValue: 240, duration: 1100, easing: Easing.linear, useNativeDriver: false })
            ).start();
        }, 700);

        // ── Logo float ───────────────────────────────────────────────────
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(logoFloat, { toValue: -7, duration: 2100, easing: Easing.ease, useNativeDriver: false }),
                    Animated.timing(logoFloat, { toValue: 7, duration: 2100, easing: Easing.ease, useNativeDriver: false }),
                ])
            ).start();
        }, 700);

        // ── Ring pulse loop ───────────────────────────────────────────────
        setTimeout(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(ringScale, { toValue: 1.22, duration: 1900, easing: Easing.ease, useNativeDriver: false }),
                        Animated.timing(ringOpacity, { toValue: 0, duration: 1900, easing: Easing.ease, useNativeDriver: false }),
                    ]),
                    Animated.parallel([
                        Animated.timing(ringScale, { toValue: 1, duration: 0, useNativeDriver: false }),
                        Animated.timing(ringOpacity, { toValue: 0.55, duration: 200, useNativeDriver: false }),
                    ]),
                ])
            ).start();
        }, 900);

        // ── Footer ────────────────────────────────────────────────────────
        setTimeout(() => {
            Animated.timing(footerOpacity, { toValue: 1, duration: 600, useNativeDriver: false }).start();
        }, 900);

        const totalAnimationDuration = 1500;
        const timer = setTimeout(() => {
            if (onAnimationComplete) {
                onAnimationComplete();
            }
        }, totalAnimationDuration);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            {/* ── Soft decorative bg circles ──────────────────────────────── */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />
            <View style={styles.bgCircle3} />

            {/* ── Falling petals ───────────────────────────────────────────── */}
            {PETALS.map((p, i) => <Petal key={i} {...p} />)}

            {/* ── Main content ─────────────────────────────────────────────── */}
            <View style={styles.content}>

                {/* Logo + ring glow */}
                <View style={styles.logoWrapper}>
                    <Animated.View style={[styles.logoRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
                    <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }, { translateY: logoFloat }] }}>
                        <Image source={YARN_IMAGE} style={styles.logo} resizeMode="contain" />
                    </Animated.View>
                </View>

                {/* Brand name */}
                <Animated.Text style={[styles.brandName, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
                    Knot<Text style={{ color: SECONDARY }}>&Bloom</Text>
                </Animated.Text>

                {/* Tagline */}
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
                    Handcrafted with love ✿
                </Animated.Text>

                {/* Progress bar */}
                <Animated.View style={[styles.progressOuter, { opacity: barOpacity }]}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { width: barWidth }]}>
                            <Animated.View style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]} />
                        </Animated.View>
                    </View>
                    <Animated.Text style={[styles.loadingLabel, { opacity: taglineOpacity }]}>
                        Loading your handmade world…
                    </Animated.Text>
                </Animated.View>

            </View>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <Animated.Text style={[styles.footerText, { opacity: footerOpacity }]}>
                Made with 🤍 in the Philippines
            </Animated.Text>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    // Decorative background circles
    bgCircle1: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: PRIMARY_LT,
        opacity: 0.45,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: -60,
        left: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: PRIMARY,
        opacity: 0.10,
    },
    bgCircle3: {
        position: 'absolute',
        top: '42%',
        left: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: SECONDARY,
        opacity: 0.06,
    },

    // Content stack
    content: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    // Logo
    logoWrapper: {
        width: 152,
        height: 152,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoRing: {
        position: 'absolute',
        width: 152,
        height: 152,
        borderRadius: 76,
        borderWidth: 2,
        borderColor: PRIMARY,
        backgroundColor: 'transparent',
    },
    logo: {
        width: 112,
        height: 112,
    },

    // Typography
    brandName: {
        fontSize: 44,
        fontFamily: 'Lovingly',
        color: TEXT_MAIN,
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    tagline: {
        fontSize: 15,
        fontFamily: 'Quicksand',
        fontWeight: '500',
        color: PRIMARY,
        textAlign: 'center',
        letterSpacing: 0.4,
        marginBottom: 32,
    },

    // Progress
    progressOuter: {
        alignItems: 'center',
        gap: 10,
        width: 220,
    },
    progressTrack: {
        width: 180,
        height: 3,
        backgroundColor: PRIMARY_LT,
        borderRadius: 9999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: PRIMARY,
        borderRadius: 9999,
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 72,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.50)',
        borderRadius: 9999,
    },
    loadingLabel: {
        fontSize: 12,
        fontFamily: 'Quicksand',
        fontWeight: '500',
        color: TEXT_MUTED,
        textAlign: 'center',
        letterSpacing: 0.2,
    },

    // Footer
    footerText: {
        position: 'absolute',
        bottom: 32,
        fontSize: 12,
        fontFamily: 'Quicksand',
        fontWeight: '500',
        color: TEXT_MUTED,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
});