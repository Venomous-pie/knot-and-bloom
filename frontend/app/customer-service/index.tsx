import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Phone, MapPin, MessageCircle, ChevronDown, ChevronUp, Send } from 'lucide-react-native';
import { Stack } from 'expo-router';

export default function CustomerServicePage() {
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const faqs = [
        {
            question: "How do I track my order?",
            answer: "Once your order ships, you'll receive a confirmation email with a tracking number. You can also view your order status in your profile under 'My Orders'."
        },
        {
            question: "What is your return policy?",
            answer: "We accept returns within 30 days of purchase for unused items in their original packaging. Custom or personalized items are final sale."
        },
        {
            question: "Do you ship internationally?",
            answer: "Yes, we ship to select countries worldwide. Shipping costs and delivery times vary by location and are calculated at checkout."
        },
        {
            question: "Can I contact the seller directly?",
            answer: "Absolutely! each artisan has a profile page where you can send them a direct message regarding their products or custom requests."
        }
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FCFAF9' }}>
            <Stack.Screen options={{ title: "Customer Service", headerShadowVisible: false, headerStyle: { backgroundColor: '#FCFAF9' } }} />
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>We're Here to Help</Text>
                    <Text style={styles.headerSubtitle}>
                        Have questions? We have answers. Reach out to our team or browse our FAQs below.
                    </Text>
                </View>

                <View style={[styles.contentContainer, isDesktop ? styles.row : styles.column]}>

                    {/* Contact Form Section */}
                    <View style={[styles.card, isDesktop ? { flex: 1, marginRight: 20 } : { marginBottom: 20 }]}>
                        <Text style={styles.sectionTitle}>Send us a Message</Text>

                        <View style={{ gap: 16, marginTop: 20 }}>
                            <View>
                                <Text style={styles.label}>Name</Text>
                                <TextInput style={styles.input} placeholder="Your name" placeholderTextColor="#999" />
                            </View>
                            <View>
                                <Text style={styles.label}>Email</Text>
                                <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor="#999" />
                            </View>
                            <View>
                                <Text style={styles.label}>Subject</Text>
                                <TextInput style={styles.input} placeholder="How can we help?" placeholderTextColor="#999" />
                            </View>
                            <View>
                                <Text style={styles.label}>Message</Text>
                                <TextInput
                                    style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                                    placeholder="Tell us more details..."
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <TouchableOpacity style={styles.submitButton}>
                                <Send size={20} color="white" />
                                <Text style={styles.submitButtonText}>Send Message</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Contact Info & FAQs */}
                    <View style={[isDesktop ? { flex: 1, marginLeft: 20 } : {}]}>

                        {/* Quick Contact Info */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Get in Touch</Text>
                            <View style={{ gap: 20, marginTop: 20 }}>
                                <View style={styles.contactItem}>
                                    <View style={styles.iconBox}>
                                        <Mail size={20} color="#B36979" />
                                    </View>
                                    <View>
                                        <Text style={styles.contactLabel}>Email Us</Text>
                                        <Text style={styles.contactValue}>support@knotandbloom.com</Text>
                                    </View>
                                </View>
                                <View style={styles.contactItem}>
                                    <View style={[styles.iconBox, { backgroundColor: '#567F4F15' }]}>
                                        <Phone size={20} color="#567F4F" />
                                    </View>
                                    <View>
                                        <Text style={styles.contactLabel}>Call Us</Text>
                                        <Text style={styles.contactValue}>+1 (555) 123-4567</Text>
                                    </View>
                                </View>
                                <View style={styles.contactItem}>
                                    <View style={[styles.iconBox, { backgroundColor: '#E6C22915' }]}>
                                        <MessageCircle size={20} color="#E6C229" />
                                    </View>
                                    <View>
                                        <Text style={styles.contactLabel}>Live Chat</Text>
                                        <Text style={styles.contactValue}>Available Mon-Fri, 9am-5pm EST</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* FAQ Section */}
                        <View style={[styles.card, { marginTop: 24 }]}>
                            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
                            <View style={{ marginTop: 10 }}>
                                {faqs.map((faq, index) => (
                                    <View key={index} style={styles.faqItem}>
                                        <TouchableOpacity
                                            style={styles.faqQuestion}
                                            onPress={() => toggleFaq(index)}
                                        >
                                            <Text style={styles.faqQuestionText}>{faq.question}</Text>
                                            {openFaq === index ? (
                                                <ChevronUp size={20} color="#666" />
                                            ) : (
                                                <ChevronDown size={20} color="#666" />
                                            )}
                                        </TouchableOpacity>
                                        {openFaq === index && (
                                            <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>

                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        padding: 40,
        backgroundColor: '#B3697910',
        alignItems: 'center',
        marginBottom: 30,
    },
    headerTitle: {
        fontFamily: 'Lovingly',
        fontSize: 36,
        color: '#B36979',
        marginBottom: 10,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        maxWidth: 600,
        lineHeight: 24,
    },
    contentContainer: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    column: {
        flexDirection: 'column',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FCFAF9',
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
    },
    submitButton: {
        backgroundColor: '#B36979',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 10,
        marginTop: 10,
    },
    submitButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#B3697915',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactLabel: {
        fontSize: 14,
        color: '#888',
        marginBottom: 2,
    },
    contactValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    faqItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 16,
    },
    faqQuestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        flex: 1,
        paddingRight: 10,
    },
    faqAnswer: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
    },
});
