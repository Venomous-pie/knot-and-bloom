import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PenTool, Sparkles, Clock, ChevronRight, MessageSquare, Palette } from 'lucide-react-native';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

const UPCOMING_FEATURES = [
    {
        icon: MessageSquare,
        color: P,
        title: 'Buyer Requests',
        desc: 'Buyers describe exactly what they want — you review and quote.',
    },
    {
        icon: Palette,
        color: INDIGO,
        title: 'Custom Quoting',
        desc: 'Set your own price and timeline for each bespoke order.',
    },
    {
        icon: Clock,
        color: TEAL,
        title: 'Production Timeline',
        desc: 'Track each custom order from request → production → delivery.',
    },
    {
        icon: Sparkles,
        color: '#F59E0B',
        title: 'AI Design Brief',
        desc: 'Let AI summarize buyer requests into a clear brief for you.',
    },
];

export default function CustomOrdersPage() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Custom Orders</Text>
                        <Text style={[{ fontSize: 13, color: '#6B7280', fontFamily: 'Quicksand', marginTop: 4 }]}>{new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                    </View>
                    <View style={s.comingSoonPill}>
                        <Clock size={12} color={P} />
                        <Text style={s.comingSoonTxt}>Coming Soon</Text>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={s.content}>
                {/* Hero */}
                <View style={[s.heroCard, isDesktop && { maxWidth: 680 }]}>
                    <View style={s.iconCircle}>
                        <PenTool size={36} color={P} />
                    </View>
                    <Text style={s.heroTitle}>Custom Orders are on the way</Text>
                    <Text style={s.heroSubtitle}>
                        Soon your buyers will be able to request bespoke, made-to-order items
                        directly through Knot & Bloom — no more DMs, no guesswork.
                        You'll get structured briefs, set your own pricing, and manage everything in one place.
                    </Text>

                    {/* Notify CTA */}
                    <TouchableOpacity style={s.cta} onPress={() => router.back()}>
                        <ChevronRight size={16} color="white" />
                        <Text style={s.ctaTxt}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>

                {/* Upcoming Features */}
                <Text style={s.sectionLabel}>What's coming</Text>
                <View style={[s.featureGrid, isDesktop && { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {UPCOMING_FEATURES.map(({ icon: Icon, color, title, desc }) => (
                        <View key={title} style={[s.featureCard, isDesktop && { flex: 1, minWidth: 240 }]}>
                            <View style={[s.featureIcon, { backgroundColor: color + '15' }]}>
                                <Icon size={20} color={color} />
                            </View>
                            <Text style={s.featureTitle}>{title}</Text>
                            <Text style={s.featureDesc}>{desc}</Text>
                        </View>
                    ))}
                </View>

                {/* Bottom note */}
                <View style={s.noteCard}>
                    <Sparkles size={16} color={P} />
                    <Text style={s.noteTxt}>
                        Custom Orders are being designed specifically for Knot & Bloom micro-sellers — simpler than enterprise tools, more structured than social media DMs.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root:            { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title:           { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    comingSoonPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P_LIGHT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    comingSoonTxt:   { fontSize: 12, fontWeight: '700', color: P, fontFamily: 'Quicksand' },
    content:         { flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center', padding: 24, paddingBottom: 52 },
    heroCard:        { backgroundColor: CARD, borderRadius: 24, padding: 32, marginBottom: 32, borderWidth: 1, borderColor: BORDER, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, alignSelf: 'center', width: '100%' },
    iconCircle:      { width: 80, height: 80, borderRadius: 40, backgroundColor: P_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    heroTitle:       { fontSize: 22, fontWeight: '800', color: TEXT, fontFamily: 'Quicksand', textAlign: 'center', marginBottom: 12 },
    heroSubtitle:    { fontSize: 24, color: SUB, fontFamily: 'Quicksand', textAlign: 'center', lineHeight: 22, marginBottom: 24, maxWidth: 520 },
    cta:             { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: P, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
    ctaTxt:          { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    sectionLabel:    { fontSize: 12, fontWeight: '600', color: SUB, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16, marginLeft: 4, fontFamily: 'Quicksand' },
    featureGrid:     { gap: 16, marginBottom: 24 },
    featureCard:     { backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    featureIcon:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    featureTitle:    { fontSize: 15, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 6 },
    featureDesc:     { fontSize: 13, color: SUB, fontFamily: 'Quicksand', lineHeight: 20 },
    noteCard:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: P_LIGHT, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: P + '30' },
    noteTxt:         { flex: 1, fontSize: 13, color: TEXT, fontFamily: 'Quicksand', lineHeight: 20 },
});
