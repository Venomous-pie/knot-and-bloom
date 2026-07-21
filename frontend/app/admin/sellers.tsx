import { sellerAPI } from "@/api/api";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput, RefreshControl, Platform, Animated } from "react-native";
import { Search, Filter, Shield, CheckCircle, XCircle, Clock, AlertTriangle, Users, List, LayoutGrid, AlignJustify } from 'lucide-react-native';
import InfoBox from "@/components/ui/InfoBox";
import StatCard from "@/components/ui/StatCard";

/** Web-native tooltip on hover for icon buttons */
function TooltipBtn({ label, style, onPress, children }: { label: string; style: any; onPress: () => void; children: React.ReactNode }) {
    if (Platform.OS === 'web') {
        return (
            <TouchableOpacity style={style} onPress={onPress}
                // @ts-ignore
                title={label} accessibilityLabel={label}>
                {children}
            </TouchableOpacity>
        );
    }
    return <TouchableOpacity style={style} onPress={onPress} accessibilityLabel={label}>{children}</TouchableOpacity>;
}

const P       = '#B36979';
const P_LIGHT = '#FDEEF1';
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const TEXT    = '#1A1A2E';
const SUB     = '#6B7280';
const BORDER  = '#F0F0F5';
const GREEN   = '#10B981';
const AMBER   = '#F59E0B';
const RED     = '#EF4444';
const INDIGO  = '#6366F1';
const TEAL    = '#14B8A6';

interface Seller {
    uid: number;
    name: string;
    email: string;
    slug: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'REJECTED';
    createdAt: string;
}

const TABS = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];

export default function AdminSellers() {
    const router = useRouter();
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid' | 'compact'>('list');
    const [containerWidth, setContainerWidth] = useState(900);
    
    // Modal state
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);

    // Animation for skeleton
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        let anim: Animated.CompositeAnimation | null = null;
        if (loading && !refreshing && sellers.length === 0) {
            anim = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
                ])
            );
            anim.start();
        } else {
            pulseAnim.setValue(0.4);
        }
        return () => anim?.stop();
    }, [loading, refreshing, sellers.length]);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const res = await sellerAPI.getSellers();
            setSellers(res.data.sellers ?? res.data ?? []);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load sellers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSellers();
        setRefreshing(false);
    };

    const updateStatus = async (id: number, status: string, reason?: string) => {
        try {
            await sellerAPI.updateSellerStatus(id, status, reason);
            setSellers(prev => prev.map(s => s.uid === id ? { ...s, status: status as any } : s));
            if (Platform.OS === 'web') {
                window.alert(`Seller status updated to ${status}`);
            } else {
                Alert.alert("Success", `Seller status updated to ${status}`);
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Failed to update status";
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert("Error", msg);
            }
        }
    };

    const openRejectModal = (id: number) => {
        setSelectedSellerId(id);
        setRejectionReason("");
        setRejectModalVisible(true);
    };

    const handleReject = () => {
        if (selectedSellerId) {
            updateStatus(selectedSellerId, 'REJECTED', rejectionReason);
            setRejectModalVisible(false);
        }
    };

    const filteredSellers = sellers.filter(s => {
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return GREEN;
            case 'PENDING': return AMBER;
            case 'SUSPENDED': return RED;
            case 'BANNED': return '#991B1B';
            case 'REJECTED': return SUB;
            default: return SUB;
        }
    };

    const numCols = viewMode === 'grid' ? Math.max(2, Math.floor(containerWidth / 250)) : 1;
    const gridGap = 16;
    const cardWidth = viewMode === 'grid' ? (containerWidth - (numCols - 1) * gridGap) / numCols : '100%';

    const renderItem = ({ item }: { item: Seller }) => {
        const statusColor = getStatusColor(item.status);
        
        if (viewMode === 'grid') {
            return (
                <View style={[s.gridCard, { width: cardWidth }]}>
                    <View style={s.gridHeaderRow}>
                        <View style={s.avatarContainer}>
                            <Text style={s.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
                            <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
                        </View>
                    </View>
                    <View style={s.gridInfo}>
                        <Text style={s.gridName} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.email} numberOfLines={1}>{item.email}</Text>
                        <Text style={s.date}>Applied: {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    
                    <View style={s.gridActions}>
                        {item.status === 'PENDING' && (
                            <>
                                <TooltipBtn label="Approve" style={s.gridBtnPrimary} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                    <CheckCircle size={14} color="#FFF" />
                                </TooltipBtn>
                                <TooltipBtn label="Reject" style={s.gridBtnRed} onPress={() => openRejectModal(item.uid)}>
                                    <XCircle size={14} color={RED} />
                                </TooltipBtn>
                            </>
                        )}
                        {item.status === 'ACTIVE' && (
                            <TooltipBtn label="Suspend" style={s.gridBtnRed} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                <AlertTriangle size={14} color={RED} />
                            </TooltipBtn>
                        )}
                        {(item.status === 'SUSPENDED' || item.status === 'REJECTED') && (
                            <TooltipBtn label="Reactivate" style={s.gridBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <CheckCircle size={14} color={GREEN} />
                            </TooltipBtn>
                        )}
                    </View>
                </View>
            );
        }

        if (viewMode === 'compact') {
            return (
                <View style={s.compactCard}>
                    <View style={s.compactInfo}>
                        <View style={s.compactColMain}>
                            <Text style={s.compactName} numberOfLines={1}>{item.name}</Text>
                            <Text style={s.compactEmail} numberOfLines={1}>{item.email}</Text>
                        </View>
                        <View style={s.compactColStatus}>
                            <View style={[s.badge, { backgroundColor: `${statusColor}20`, alignSelf: 'flex-start' }]}>
                                <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
                            </View>
                        </View>
                        <View style={s.compactColDate}>
                            <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                    </View>
                    <View style={s.compactActions}>
                        {item.status === 'PENDING' && (
                            <>
                                <TooltipBtn label="Approve" style={s.compactOutlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                    <CheckCircle size={16} color={GREEN} />
                                </TooltipBtn>
                                <TooltipBtn label="Reject" style={s.compactOutlineBtnRed} onPress={() => openRejectModal(item.uid)}>
                                    <XCircle size={16} color={RED} />
                                </TooltipBtn>
                            </>
                        )}
                        {item.status === 'ACTIVE' && (
                            <TooltipBtn label="Suspend" style={s.compactOutlineBtnAmber} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                                <AlertTriangle size={16} color={AMBER} />
                            </TooltipBtn>
                        )}
                        {(item.status === 'SUSPENDED' || item.status === 'REJECTED') && (
                            <TooltipBtn label="Reactivate" style={s.compactOutlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <CheckCircle size={16} color={GREEN} />
                            </TooltipBtn>
                        )}
                    </View>
                </View>
            );
        }

        return (
            <View style={s.card}>
                <View style={s.cardInfo}>
                    <View style={s.avatarContainer}>
                        <Text style={s.avatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                    <View style={s.detailsContainer}>
                        <View style={s.nameRow}>
                            <Text style={s.name}>{item.name}</Text>
                            <View style={[s.badge, { backgroundColor: `${statusColor}20` }]}>
                                <Text style={[s.badgeText, { color: statusColor }]}>{item.status}</Text>
                            </View>
                        </View>
                        <Text style={s.email}>{item.email}</Text>
                        <Text style={s.date}>Applied: {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                </View>
                
                <View style={s.actions}>
                    {item.status === 'PENDING' && (
                        <>
                            <TooltipBtn label="Approve seller" style={s.primaryBtn} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                                <CheckCircle size={14} color="#FFF" />
                                <Text style={s.primaryBtnText}>Approve</Text>
                            </TooltipBtn>
                            <TooltipBtn label="Reject application" style={s.outlineBtnRed} onPress={() => openRejectModal(item.uid)}>
                                <XCircle size={14} color={RED} />
                                <Text style={s.outlineBtnRedText}>Reject</Text>
                            </TooltipBtn>
                        </>
                    )}
                    {item.status === 'ACTIVE' && (
                        <TooltipBtn label="Suspend seller" style={s.outlineBtnRed} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                            <AlertTriangle size={14} color={RED} />
                            <Text style={s.outlineBtnRedText}>Suspend</Text>
                        </TooltipBtn>
                    )}
                    {(item.status === 'SUSPENDED' || item.status === 'REJECTED') && (
                        <TooltipBtn label="Reactivate seller" style={s.outlineBtnGreen} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                            <CheckCircle size={14} color={GREEN} />
                            <Text style={s.outlineBtnGreenText}>Reactivate</Text>
                        </TooltipBtn>
                    )}
                </View>
            </View>
        );
    };

    const stats = {
        total: sellers.length,
        pending: sellers.filter(s => s.status === 'PENDING').length,
        active: sellers.filter(s => s.status === 'ACTIVE').length,
    };

    return (
        <View style={s.container}>
            <Stack.Screen options={{ title: "Manage Sellers" }} />
            
            {/* Header Bar */}
            <View style={s.headerContainer}>
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Manage Sellers</Text>
                        <Text style={s.subtitle}>Review applications and manage active seller accounts</Text>
                    </View>
                </View>
            </View>

            {/* Scrollable Content */}
            <View style={s.contentWrapper} onLayout={e => setContainerWidth(e.nativeEvent.layout.width - 40)}>
                <FlatList
                    data={filteredSellers}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[P]} tintColor={P} />
                    }
                    ListHeaderComponent={
                        <>
                            {/* Stats */}
                            <View style={s.statRow}>
                                <StatCard
                                    label="Total Sellers" value={String(stats.total)}
                                    icon={<Users size={20} color={P} />} color={P} isLoading={loading}
                                    tooltip="Total number of registered seller accounts"
                                />
                                <StatCard
                                    label="Pending Approval" value={String(stats.pending)}
                                    icon={<Clock size={20} color={AMBER} />} color={AMBER} isLoading={loading}
                                    tooltip="Seller applications awaiting your review"
                                />
                                <StatCard
                                    label="Active Sellers" value={String(stats.active)}
                                    icon={<CheckCircle size={20} color={GREEN} />} color={GREEN} isLoading={loading}
                                    tooltip="Sellers who are actively trading on the platform"
                                />
                            </View>

                            {stats.pending > 0 && statusFilter !== 'PENDING' && (
                                <InfoBox
                                    message={`You have ${stats.pending} pending seller application(s) awaiting review.`}
                                    type="warning"
                                    style={{ marginBottom: 16 }}
                                />
                            )}

                            {/* Search and Filters */}
                            <View style={s.filterBar}>
                                <View style={s.searchContainer}>
                                    <Search size={18} color={SUB} style={s.searchIcon} />
                                    <TextInput
                                        style={s.searchInput}
                                        placeholder="Search sellers..."
                                        placeholderTextColor={SUB}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>
                            </View>

                            {/* Filters, Tabs & View Toggle */}
                            <View style={s.filterBarContainer}>
                                <View style={s.tabsContainer}>
                                    {TABS.map(tab => (
                                        <TouchableOpacity
                                            key={tab}
                                            onPress={() => setStatusFilter(tab)}
                                            style={[s.tab, statusFilter === tab && s.tabActive]}
                                        >
                                            <Text style={[s.tabText, statusFilter === tab && s.tabTextActive]}>
                                                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                                            </Text>
                                            {tab === 'PENDING' && stats.pending > 0 && (
                                                <View style={s.pendingBadge}>
                                                    <Text style={s.pendingBadgeTxt}>!</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={s.viewToggle}>
                                    <TouchableOpacity onPress={() => setViewMode('list')} style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}>
                                        <List size={16} color={viewMode === 'list' ? P : SUB} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setViewMode('grid')} style={[s.viewBtn, viewMode === 'grid' && s.viewBtnActive]}>
                                        <LayoutGrid size={16} color={viewMode === 'grid' ? P : SUB} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setViewMode('compact')} style={[s.viewBtn, viewMode === 'compact' && s.viewBtnActive]}>
                                        <AlignJustify size={16} color={viewMode === 'compact' ? P : SUB} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* List Headers for Compact Mode */}
                            {viewMode === 'compact' && (
                                <View style={s.compactHeaderRow}>
                                    <Text style={[s.compactHeaderTxt, s.compactColMain]}>Seller</Text>
                                    <Text style={[s.compactHeaderTxt, s.compactColStatus]}>Status</Text>
                                    <Text style={[s.compactHeaderTxt, s.compactColDate]}>Applied</Text>
                                    <Text style={[s.compactHeaderTxt, s.compactColActions, { textAlign: 'right' }]}>Actions</Text>
                                </View>
                            )}

                            {loading && !refreshing && sellers.length === 0 && (
                                <Animated.View style={{ opacity: pulseAnim, width: '100%', marginTop: 8 }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <View key={i} style={s.skeletonCard}>
                                            <View style={s.skeletonAvatar} />
                                            <View style={s.skeletonInfo}>
                                                <View style={s.skeletonTextLine1} />
                                                <View style={s.skeletonTextLine2} />
                                            </View>
                                            <View style={s.skeletonBtn} />
                                        </View>
                                    ))}
                                </Animated.View>
                            )}
                        </>
                    }
                    key={viewMode === 'grid' ? `grid-${numCols}` : 'list'}
                    numColumns={viewMode === 'grid' ? numCols : 1}
                    columnWrapperStyle={viewMode === 'grid' ? { gap: gridGap } : undefined}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={s.emptyState}>
                                <Text style={s.emptyText}>No sellers found.</Text>
                            </View>
                        ) : null
                    }
                />
            </View>

            {/* Rejection Modal */}
            {rejectModalVisible && (
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Reject Application</Text>
                        <Text style={s.modalSubtitle}>Please provide a reason for rejection. This will be visible to the applicant.</Text>
                        <TextInput
                            style={s.input}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            placeholder="e.g. Incomplete portfolio..."
                            placeholderTextColor={SUB}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={s.modalActions}>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectModalVisible(false)}>
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.rejectConfirmBtn} onPress={handleReject}>
                                <Text style={s.rejectConfirmBtnText}>Reject Application</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    headerContainer: { backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 24, paddingVertical: 16, zIndex: 100 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1280, width: '100%', alignSelf: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    subtitle: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginTop: 4 },
    contentWrapper: { flex: 1, maxWidth: 1280, width: '100%', alignSelf: 'center' },
    
    statRow: { flexDirection: 'row', gap: 16, marginBottom: 24, zIndex: 100, flexWrap: 'wrap' },
    
    filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: BORDER, height: 44 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Quicksand', color: TEXT, outlineStyle: 'none' as any },
    
    filterBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
    tabsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, gap: 6 },
    tabActive: { backgroundColor: P_LIGHT, borderColor: P },
    tabText: { fontSize: 13, fontWeight: '700', fontFamily: 'Quicksand', color: SUB },
    tabTextActive: { color: P },
    pendingBadge: { backgroundColor: AMBER, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    pendingBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

    viewToggle: { flexDirection: 'row', backgroundColor: BORDER, borderRadius: 12, padding: 4 },
    viewBtn: { padding: 6, borderRadius: 8 },
    viewBtnActive: { backgroundColor: CARD, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

    // List View
    card: { backgroundColor: CARD, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
    cardInfo: { flexDirection: 'row', flex: 1, minWidth: 250, alignItems: 'center' },
    avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: P_LIGHT, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { fontSize: 20, fontWeight: '700', color: P, fontFamily: 'Quicksand' },
    detailsContainer: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontWeight: '700', fontSize: 10, fontFamily: 'Quicksand', letterSpacing: 0.5 },
    email: { fontSize: 13, color: SUB, fontFamily: 'Quicksand', marginBottom: 2 },
    date: { fontSize: 11, color: SUB, fontFamily: 'Quicksand' },
    
    actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    primaryBtn: { backgroundColor: P, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 13, fontFamily: 'Quicksand' },
    outlineBtnRed: { backgroundColor: CARD, borderWidth: 1, borderColor: RED, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
    outlineBtnRedText: { color: RED, fontWeight: '600', fontSize: 13, fontFamily: 'Quicksand' },
    outlineBtnGreen: { backgroundColor: CARD, borderWidth: 1, borderColor: GREEN, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
    outlineBtnGreenText: { color: GREEN, fontWeight: '600', fontSize: 13, fontFamily: 'Quicksand' },

    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: SUB, fontFamily: 'Quicksand', fontStyle: 'italic' },

    // Grid View
    gridCard: { backgroundColor: CARD, borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: BORDER },
    gridHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    gridInfo: { flex: 1, paddingBottom: 12 },
    gridName: { fontSize: 16, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 4 },
    gridActions: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
    gridBtnPrimary: { flex: 1, backgroundColor: P, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    gridBtnRed: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: RED, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    gridBtnGreen: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: GREEN, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },

    // Compact View
    compactHeaderRow: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 8, marginBottom: 8 },
    compactHeaderTxt: { fontSize: 12, fontWeight: '700', color: SUB, fontFamily: 'Quicksand', textTransform: 'uppercase', letterSpacing: 0.5 },
    compactCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
    compactInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    compactColMain: { flex: 2, paddingRight: 16 },
    compactName: { fontSize: 14, fontWeight: '700', color: TEXT, fontFamily: 'Quicksand', marginBottom: 2 },
    compactEmail: { fontSize: 12, color: SUB, fontFamily: 'Quicksand' },
    compactColStatus: { width: 100 },
    compactColDate: { width: 100 },
    compactColActions: { width: 80 },
    compactActions: { flexDirection: 'row', gap: 8, width: 80, justifyContent: 'flex-end' },
    compactActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
    compactActionBtnRed: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnGreen: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnRed: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: RED, alignItems: 'center', justifyContent: 'center' },
    compactOutlineBtnAmber: { width: 36, height: 36, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: AMBER, alignItems: 'center', justifyContent: 'center' },

    // Skeletons
    skeletonCard: { backgroundColor: CARD, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 16 },
    skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E2E8F0' },
    skeletonInfo: { flex: 1, gap: 8 },
    skeletonTextLine1: { width: '50%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 8 },
    skeletonTextLine2: { width: '30%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 8 },
    skeletonBtn: { width: 100, height: 36, borderRadius: 16, backgroundColor: '#E2E8F0' },

    // Modal
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
    modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 8, fontFamily: 'Quicksand' },
    modalSubtitle: { fontSize: 13, color: SUB, marginBottom: 20, fontFamily: 'Quicksand' },
    input: { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, fontSize: 14, fontFamily: 'Quicksand', color: TEXT, minHeight: 100, textAlignVertical: 'top', marginBottom: 24, outlineStyle: 'none' as any },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: BG },
    cancelBtnText: { color: SUB, fontWeight: '600', fontFamily: 'Quicksand', fontSize: 14 },
    rejectConfirmBtn: { backgroundColor: RED, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    rejectConfirmBtnText: { color: 'white', fontWeight: '700', fontFamily: 'Quicksand', fontSize: 14 }
});
