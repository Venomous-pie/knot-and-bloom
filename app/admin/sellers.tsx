
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/sellers`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setSellers(data);
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

    const updateStatus = async (id: number, status: string) => {
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/sellers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Update failed");

            // Optimistic update or refresh
            setSellers(prev => prev.map(s => s.uid === id ? { ...s, status: status as any } : s));
            Alert.alert("Success", `Seller status updated to ${status}`);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
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
                    <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => updateStatus(item.uid, 'ACTIVE')}>
                        <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>
                )}
                {item.status !== 'SUSPENDED' && item.status !== 'BANNED' && (
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
    btnText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});
