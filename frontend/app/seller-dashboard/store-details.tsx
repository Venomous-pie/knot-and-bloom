import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Save } from 'lucide-react-native';
import SettingsSidebar from '@/components/seller/SettingsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { sellerAPI, apiClient } from '@/services/api';
import { toastEvents } from '@/utils/toastEvents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ImageUploader from '@/components/seller/ImageUploader';

const P       = '#B36979';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';

export default function StoreDetailsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 1024;
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [meetUpPoint, setMeetUpPoint] = useState('');
    const [socialMediaLink, setSocialMediaLink] = useState('');
    const [logo, setLogo] = useState('');
    const [banner, setBanner] = useState('');

    const queryClient = useQueryClient();

    const { data: seller, isLoading: queryLoading } = useQuery({
        queryKey: ['sellerProfile', user?.sellerProfile?.slug],
        queryFn: async () => {
            const res = await apiClient.get(`/sellers/${user?.sellerProfile?.slug}`);
            return res.data;
        },
        enabled: !!user?.sellerProfile?.slug,
    });

    useEffect(() => {
        if (authLoading) return;
        if (!user || !user.sellerProfile?.uid) {
            router.replace('/' as any);
            return;
        }

        if (seller) {
            setName(seller.name || '');
            setDescription(seller.description || '');
            setBusinessAddress(seller.businessAddress || '');
            setMeetUpPoint(seller.meetUpPoint || '');
            setSocialMediaLink(seller.socialMediaLink || '');
            setLogo(seller.logo || '');
            setBanner(seller.banner || '');
        } else {
            // Fallback to user context initially
            const profile = user.sellerProfile;
            setName(profile.name || '');
            setDescription(profile.description || '');
            setBusinessAddress(profile.businessAddress || '');
            setMeetUpPoint(profile.meetUpPoint || '');
            setSocialMediaLink(profile.socialMediaLink || '');
            setLogo(profile.logo || '');
            setBanner(profile.banner || '');
        }
        setLoading(false);
    }, [user, authLoading, seller]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => sellerAPI.updateSellerProfile(user!.sellerProfile!.uid, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sellerProfile', user?.sellerProfile?.slug] });
            toastEvents.emit({ message: 'Store details updated!', type: 'SUCCESS' });
            router.back();
        },
        onError: (error) => {
            console.error('Failed to update store details:', error);
            toastEvents.emit({ message: 'Failed to update store details.', type: 'ERROR' });
        },
        onSettled: () => setSaving(false),
    });

    const handleSave = () => {
        if (!user?.sellerProfile?.uid) return;
        setSaving(true);
        updateMutation.mutate({
            name,
            description,
            businessAddress,
            meetUpPoint,
            socialMediaLink,
            logo,
            banner
        });
    };

    // Removed full-screen loading state to prevent flash, just like other pages

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Store Details</Text>
                        <Text style={styles.headerSubtitle}>Manage shop name, bio, avatar, and banner.</Text>
                    </View>
                    <Pressable 
                        style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Save size={16} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </Pressable>
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
                    
                    <Text style={styles.sectionLabel}>Public Profile</Text>
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Shop Logo (Avatar)</Text>
                        <View style={{ marginBottom: 16 }}>
                            <ImageUploader 
                                images={logo ? [{ uri: logo, isUrl: true }] : []}
                                onImagesChange={(imgs) => setLogo(imgs[0]?.uri || '')}
                                maxImages={1}
                                compact={true}
                                hidePrimaryBadge={true}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Shop Banner</Text>
                        <View style={{ marginBottom: 16 }}>
                            <ImageUploader 
                                images={banner ? [{ uri: banner, isUrl: true }] : []}
                                onImagesChange={(imgs) => setBanner(imgs[0]?.uri || '')}
                                maxImages={1}
                                compact={true}
                                hidePrimaryBadge={true}
                            />
                        </View>

                        <Text style={styles.inputLabel}>Shop Name</Text>
                        <TextInput
                            style={[styles.input, focusedInput === 'name' && styles.inputFocused]}
                            placeholder="Your Shop Name"
                            placeholderTextColor={SUB}
                            value={name}
                            onChangeText={setName}
                            onFocus={() => setFocusedInput('name')}
                            onBlur={() => setFocusedInput(null)}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Bio / Description</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }, focusedInput === 'desc' && styles.inputFocused]}
                            placeholder="Tell buyers about your shop and handmade items..."
                            placeholderTextColor={SUB}
                            multiline
                            value={description}
                            onChangeText={setDescription}
                            onFocus={() => setFocusedInput('desc')}
                            onBlur={() => setFocusedInput(null)}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Social Media Link</Text>
                        <TextInput
                            style={[styles.input, focusedInput === 'social' && styles.inputFocused]}
                            placeholder="e.g. instagram.com/yourshop"
                            placeholderTextColor={SUB}
                            value={socialMediaLink}
                            onChangeText={setSocialMediaLink}
                            onFocus={() => setFocusedInput('social')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>Location Details</Text>
                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Business Address</Text>
                        <TextInput
                            style={[styles.input, focusedInput === 'address' && styles.inputFocused]}
                            placeholder="Your full business address"
                            placeholderTextColor={SUB}
                            value={businessAddress}
                            onChangeText={setBusinessAddress}
                            onFocus={() => setFocusedInput('address')}
                            onBlur={() => setFocusedInput(null)}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Meet-up Point</Text>
                        <Text style={styles.helperText}>If you offer local pickups, where can buyers meet you?</Text>
                        <TextInput
                            style={[styles.input, focusedInput === 'meetup' && styles.inputFocused]}
                            placeholder="e.g. Starbucks, Main Street"
                            placeholderTextColor={SUB}
                            value={meetUpPoint}
                            onChangeText={setMeetUpPoint}
                            onFocus={() => setFocusedInput('meetup')}
                            onBlur={() => setFocusedInput(null)}
                        />
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
    saveBtn: { backgroundColor: P, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 120 },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 14, fontFamily: 'Quicksand' },
    content: { padding: 20, paddingBottom: 60, maxWidth: 800, alignSelf: 'center', width: '100%' },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: SUB, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 4, fontFamily: 'Quicksand' },
    card: { backgroundColor: CARD, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    helperText: { fontSize: 12, color: SUB, marginBottom: 8, fontFamily: 'Quicksand' },
    input: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: TEXT, fontFamily: 'Quicksand' },
    inputFocused: { borderColor: P, backgroundColor: '#FFF' },
});
