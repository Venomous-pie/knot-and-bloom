import { sellerAPI } from "@/api/api";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, TextInput } from "react-native";

interface Seller {
    uid: number;
    name: string;
    email: string;
    slug: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';
    createdAt: string;
}

export default function AdminSellers() {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const res = await sellerAPI.getSellers();
            setSellers(res.data);
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

    const updateStatus = async (id: number, status: string, reason?: string) => {
        try {
            await sellerAPI.updateSellerStatus(id, status, reason);
            // Optimistic update
            setSellers(prev => prev.map(s => s.uid === id ? { ...s, status: status as any } : s));
            Alert.alert("Success", `Seller status updated to ${status}`);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
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

    const renderItem = ({ item }: { item: Seller }) => (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
            </View>
            <View style={styles.actions}>
                {item.status === 'PENDING' && (
                    <>
                        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                            <Text style={styles.btnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => openRejectModal(item.uid)}>
                            <Text style={styles.btnText}>Reject</Text>
                        </TouchableOpacity>
                    </>
                )}
                {item.status === 'ACTIVE' && (
                    <TouchableOpacity style={[styles.btn, styles.suspendBtn]} onPress={() => updateStatus(item.uid, 'SUSPENDED')}>
                        <Text style={styles.btnText}>Suspend</Text>
                    </TouchableOpacity>
                )}
                {item.status === 'SUSPENDED' && (
                    <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                        <Text style={styles.btnText}>Reactivate</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'green';
            case 'PENDING': return 'orange';
            case 'SUSPENDED': return 'red';
            case 'BANNED': return 'darkred';
            case 'REJECTED': return 'gray';
            default: return 'gray';
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: "Manage Sellers" }} />
            {loading ? (
                <ActivityIndicator size="large" />
            ) : (
                <FlatList
                    data={sellers}
                    keyExtractor={item => String(item.uid)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Rejection Modal */}
            {rejectModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Application</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={rejectionReason}
                                onChangeText={setRejectionReason}
                                placeholder="e.g. Incomplete information"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setRejectModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.confirmRejectBtn]} onPress={handleReject}>
                                <Text style={styles.btnText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    list: { padding: 16 },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold' },
    email: { fontSize: 14, color: '#666' },
    status: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8 },
    btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
    approveBtn: { backgroundColor: '#4CAF50' },
    suspendBtn: { backgroundColor: '#FF9800' },
    rejectBtn: { backgroundColor: '#D32F2F' },
    btnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333'
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        height: 100, // Multiline needs more height
        borderWidth: 2,
        borderColor: "#EEE",
        borderRadius: 4,
        padding: 16,
        fontSize: 16,
        backgroundColor: "#FAFAFA",
        color: "#333",
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12
    },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6
    },
    cancelBtn: {
        backgroundColor: '#f5f5f5'
    },
    confirmRejectBtn: {
        backgroundColor: '#D32F2F'
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '600'
    }
});
