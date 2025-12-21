
import { sellerAPI } from "@/api/api";
import { useAuth } from "@/app/auth";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width, height } = Dimensions.get('window');
const MOBILE_BREAKPOINT = 768;

const STEPS = [
    {
        id: 1,
        icon: "🎉",
        title: "Congratulations!",
        body: (name: string) => `You're now an official seller on Knot & Bloom!\n\nYour shop is ready to welcome customers from across the Philippines.`,
        cta: "Get Started",
        secondary: "Skip for now"
    },
    {
        id: 2,
        icon: "📦",
        title: "Add Your First Product",
        body: () => `Start by listing an item you're proud of.\n\nGreat product photos and detailed descriptions help customers fall in love with your creations.`,
        tips: [
            "Use clear, well-lit photos",
            "Write detailed descriptions",
            "Set competitive pricing",
            "Add relevant tags"
        ],
        cta: "Next",
        secondary: "Back"
    },
    {
        id: 3,
        icon: "💡",
        title: "How Selling Works",
        body: () => `Here's what happens when customers buy:`,
        timeline: [
            { title: "Customer places order", desc: "You get instant notification" },
            { title: "You prepare & ship", desc: "Mark as 'Shipped' & add tracking" },
            { title: "Customer receives", desc: "They confirm delivery" },
            { title: "You get paid", desc: "Funds released to your account" }
        ],
        cta: "Next",
        secondary: "Back"
    },
    {
        id: 4,
        icon: "📊",
        title: "Your Seller Dashboard",
        body: () => `Everything you need in one place:`,
        features: [
            "📈 Sales Analytics",
            "📋 Order Management",
            "🏪 Shop Settings",
            "💬 Customer Messages"
        ],
        cta: "Go to Dashboard",
        secondary: "Back"
    }
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function SellerWelcomeModal({ visible, onClose }: Props) {
    const { user, refreshUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    const handleComplete = async () => {
        try {
            await sellerAPI.markWelcomeSeen();
            await refreshUser(); // Update local user state
            onClose();
        } catch (error) {
            console.error(error);
            onClose(); // Close anyway on error
        }
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const stepData = STEPS[currentStep];
    const isMobile = width < MOBILE_BREAKPOINT;

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.modalContainer,
                    isMobile && styles.mobileModal,
                    { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                ]}>
                    {/* Progress Bar */}
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${((currentStep + 1) / 4) * 100}%` }]} />
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.icon}>{stepData.icon}</Text>
                        <Text style={styles.title}>
                            {currentStep === 0 ? stepData.title.replace("Congratulations!", `Congratulations, ${user?.name?.split(' ')[0]}!`) : stepData.title}
                        </Text>

                        <Text style={styles.body}>
                            {typeof stepData.body === 'function' ? stepData.body(user?.name || '') : stepData.body}
                        </Text>

                        {/* Step 2 Tips */}
                        {stepData.tips && (
                            <View style={styles.listContainer}>
                                {stepData.tips.map((tip, i) => (
                                    <View key={i} style={styles.listItem}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <Text style={styles.listText}>{tip}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Step 3 Timeline */}
                        {stepData.timeline && (
                            <View style={styles.timelineContainer}>
                                {stepData.timeline.map((item, i) => (
                                    <View key={i} style={styles.timelineItem}>
                                        <View style={styles.timelineNumber}><Text style={styles.numberText}>{i + 1}</Text></View>
                                        <View>
                                            <Text style={styles.timelineTitle}>{item.title}</Text>
                                            <Text style={styles.timelineDesc}>{item.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Step 4 Features */}
                        {stepData.features && (
                            <View style={styles.gridContainer}>
                                {stepData.features.map((feature, i) => (
                                    <View key={i} style={styles.gridItem}>
                                        <Text style={styles.gridText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer / Buttons */}
                    <View style={styles.footer}>
                        {currentStep === 0 ? (
                            <>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={handleComplete}>
                                    <Text style={styles.secondaryBtnText}>{stepData.secondary}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                                    <Text style={styles.primaryBtnText}>{stepData.cta} →</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
                                    <Text style={styles.secondaryBtnText}>← Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                                    <Text style={styles.primaryBtnText}>{stepData.cta} {currentStep < 3 && '→'}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: 600,
        maxHeight: '90%',
        backgroundColor: '#FFFBF0', // Cream background
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    mobileModal: {
        width: '90%',
        maxHeight: '85%',
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E5E5E5',
        width: '100%',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#10B981', // Success green
    },
    content: {
        padding: 32,
        alignItems: 'center',
    },
    icon: {
        fontSize: 48,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8B4513', // Warm brown
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'serif',
    },
    body: {
        fontSize: 16,
        color: '#4A4A4A',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    listContainer: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        gap: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    listText: {
        fontSize: 15,
        color: '#333',
    },
    timelineContainer: {
        width: '100%',
        gap: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    numberText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    timelineTitle: {
        fontWeight: 'bold',
        color: '#333',
    },
    timelineDesc: {
        color: '#666',
        fontSize: 14,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    gridItem: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    gridText: {
        color: '#555',
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    primaryBtn: {
        backgroundColor: '#8B4513',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    primaryBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    secondaryBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    secondaryBtnText: {
        color: '#666',
        fontSize: 16,
    },
});
