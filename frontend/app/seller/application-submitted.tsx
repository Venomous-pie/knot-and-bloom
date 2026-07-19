import { useAuth } from "@/contexts/AuthContext";
import { RelativePathString, useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
    ScrollView,
    Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { CheckCircle, Clock, ArrowRight } from "lucide-react-native";

// A small SVG noise texture converted to a Data URI
const NOISE_TEXTURE = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

export default function ApplicationSubmittedPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 768;
    
    // Guard: only accessible if user has a PENDING application
    React.useEffect(() => {
        if (user && user.sellerStatus !== "PENDING") {
            router.replace("/" as any);
        }
    }, [user]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { maxWidth: isDesktop ? 860 : 460 }]}>
                    {/* Subtle Noise Texture Overlay */}
                    <Image 
                        source={{ uri: NOISE_TEXTURE }} 
                        style={[StyleSheet.absoluteFill, { opacity: 0.04, borderRadius: 24 }]} 
                        resizeMode="repeat" 
                    />

                    <View style={isDesktop ? styles.row : styles.column}>
                        
                        {/* Left Column */}
                        <View style={[isDesktop ? styles.leftCol : styles.mobileCol]}>
                            <View style={styles.iconWrapper}>
                                <View style={styles.iconBackground}>
                                    <CheckCircle size={48} color={theme.colors.success} strokeWidth={2.5} />
                                </View>
                            </View>

                            <View style={styles.headerTextContainer}>
                                <Text style={styles.title}>Application Submitted!</Text>
                                <Text style={styles.subtitle}>
                                    Welcome to the Knot & Bloom seller community. Your journey begins here.
                                </Text>
                            </View>
                        </View>

                        {/* Divider for desktop */}
                        {isDesktop && <View style={styles.verticalDivider} />}

                        {/* Right Column */}
                        <View style={[isDesktop ? styles.rightCol : styles.mobileCol]}>
                            {!isDesktop && <View style={styles.horizontalDivider} />}
                            
                            <Text style={styles.sectionLabel}>What's Next?</Text>
                            
                            <View style={styles.timeline}>
                                {/* Step 1 */}
                                <View style={styles.timelineStep}>
                                    <View style={styles.timelineLine} />
                                    <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTitle}>Review in Progress</Text>
                                        <Text style={styles.timelineDesc}>Our team will review your application within 48 hours.</Text>
                                    </View>
                                </View>

                                {/* Step 2 */}
                                <View style={styles.timelineStep}>
                                    <View style={styles.timelineLine} />
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTitle}>Get Approved</Text>
                                        <Text style={styles.timelineDesc}>Once approved, you'll receive an email notification.</Text>
                                    </View>
                                </View>

                                {/* Step 3 */}
                                <View style={[styles.timelineStep, { marginBottom: 0 }]}>
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineTitle}>Start Selling</Text>
                                        <Text style={styles.timelineDesc}>Access your seller dashboard to add products.</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.buttonContainer}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.primaryBtn,
                                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                                    ]}
                                    onPress={() => router.push("/seller/application-status" as RelativePathString)}
                                >
                                    <Text style={styles.primaryBtnText}>View Application Status</Text>
                                    <ArrowRight size={18} color="white" />
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [
                                        styles.outlineBtn,
                                        pressed && { backgroundColor: theme.colors.background }
                                    ]}
                                    onPress={() => router.push("/profile" as RelativePathString)}
                                >
                                    <Text style={styles.outlineBtnText}>Return to Profile</Text>
                                </Pressable>
                            </View>
                        </View>

                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    row: {
        flexDirection: 'row',
    },
    column: {
        flexDirection: 'column',
    },
    leftCol: {
        flex: 1,
        paddingRight: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightCol: {
        flex: 1.1,
        paddingLeft: 32,
        justifyContent: 'center',
    },
    mobileCol: {
        width: '100%',
        alignItems: 'center',
    },
    verticalDivider: {
        width: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    horizontalDivider: {
        height: 1,
        width: '100%',
        backgroundColor: theme.colors.border,
        marginVertical: 24,
    },
    iconWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBackground: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: theme.colors.success + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
    },
    statusBox: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        width: '100%',
        maxWidth: 300,
    },
    statusTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.warning + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.warning,
        fontFamily: 'Quicksand',
    },
    statusHint: {
        fontSize: 11,
        color: theme.colors.textLight,
        fontFamily: 'Quicksand',
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    timeline: {
        marginBottom: 4,
        width: '100%',
    },
    timelineStep: {
        flexDirection: 'row',
        marginBottom: 24,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 9,
        top: 22,
        bottom: -22,
        width: 2,
        backgroundColor: theme.colors.border,
        zIndex: 0,
    },
    timelineDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.border,
        marginTop: 2,
        marginRight: 16,
        zIndex: 1,
    },
    timelineContent: {
        flex: 1,
    },
    timelineTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'Quicksand',
        marginBottom: 4,
    },
    timelineDesc: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: 'Quicksand',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 24,
        width: '100%',
    },
    buttonContainer: {
        gap: 12,
        width: '100%',
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        fontFamily: 'Quicksand',
    },
    outlineBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineBtnText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
        fontSize: 15,
        fontFamily: 'Quicksand',
    },
});
