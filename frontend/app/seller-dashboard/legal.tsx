import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShieldCheck, FileText, Briefcase, Info } from 'lucide-react-native';
import SettingsSidebar from '@/components/seller/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';

export default function LegalPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !user.sellerProfile?.uid) {
            router.replace('/' as any);
            return;
        }
        setLoading(false);
    }, [user, authLoading]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={P} />
            </View>
        );
    }

    const profile = user?.sellerProfile;

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Tax & Legal</Text>
                        <Text style={styles.headerSubtitle}>Business registration details and tax identifiers.</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', maxWidth: 1024, alignSelf: 'center', width: '100%' }}>
                {isDesktop && (
                    <View style={{ width: 240, display: 'flex' }}>
                        <SettingsSidebar />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.infoBanner}>
                        <Info size={16} color={P} style={{ marginTop: 2 }} />
                        <Text style={styles.infoBannerText}>
                            Your legal details are securely verified by our team. If you need to update your registered name or ID, please contact seller support.
                        </Text>
                    </View>

                    <Text style={styles.sectionLabel}>Verified Business Details</Text>
                    
                    <View style={styles.card}>
                        
                        {/* Status Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                            <ShieldCheck size={24} color={GREEN} />
                            <View>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' }}>Account Verified</Text>
                                <Text style={{ fontSize: 13, color: SUB, fontFamily: 'Quicksand' }}>Identity successfully verified</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <FileText size={18} color={SUB} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>Legal Name</Text>
                                <Text style={styles.detailValue}>{profile?.legalName || profile?.name || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Briefcase size={18} color={SUB} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>Business Type</Text>
                                <Text style={styles.detailValue}>{profile?.businessType || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <FileText size={18} color={SUB} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>ID Type</Text>
                                <Text style={styles.detailValue}>{profile?.idType || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={[styles.detailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                            <View style={styles.detailIcon}>
                                <FileText size={18} color={SUB} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.detailLabel}>ID Number</Text>
                                <Text style={styles.detailValue}>
                                    {profile?.idNumber ? `••••${profile.idNumber.slice(-4)}` : 'N/A'}
                                </Text>
                            </View>
                        </View>

                    </View>

                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    headerSubtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },
    content: { padding: 20, paddingBottom: 60, maxWidth: 800, alignSelf: 'center', width: '100%' },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: SUB, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4, fontFamily: 'Quicksand' },
    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    infoBanner: { flexDirection: 'row', backgroundColor: P_LIGHT, padding: 16, borderRadius: 12, marginBottom: 24, gap: 12, alignItems: 'flex-start' },
    infoBannerText: { flex: 1, color: P, fontSize: 13, lineHeight: 20, fontFamily: 'Quicksand', fontWeight: '500' },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 16 },
    detailIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 12, color: SUB, marginBottom: 2, fontFamily: 'Quicksand' },
    detailValue: { fontSize: 15, fontWeight: '600', color: TEXT, fontFamily: 'Quicksand' }
});
