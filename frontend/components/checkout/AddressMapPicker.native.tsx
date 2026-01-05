import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Platform, Alert } from 'react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface AddressMapPickerProps {
    onLocationSelect: (address: any) => void;
    onClose: () => void;
    initialLocation?: { lat: number; lng: number };
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({ onLocationSelect, onClose, initialLocation }) => {
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState<Region>({
        latitude: initialLocation?.lat || 37.78825,
        longitude: initialLocation?.lng || -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState<string>('');

    useEffect(() => {
        (async () => {
            if (!initialLocation) {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission to access location was denied');
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            }
        })();
    }, [initialLocation]);

    const fetchAddress = async (lat: number, lon: number) => {
        setLoading(true);
        try {
            // Using OpenStreetMap Nominatim API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                {
                    headers: {
                        'User-Agent': 'KnotAndBloomApp/1.0',
                    },
                }
            );
            const data = await response.json();
            if (data && data.address) {
                setAddress(data.display_name);

                // Parse address components for the form
                const addressComponents = {
                    fullAddress: data.display_name,
                    street: data.address.road || data.address.pedestrian || '',
                    city: data.address.city || data.address.town || data.address.village || '',
                    state: data.address.state || '',
                    zipCode: data.address.postcode || '',
                    country: data.address.country || '',
                    lat: lat,
                    lng: lon
                };
                // Store the parsed data to be sent on confirm
                return addressComponents;
            }
        } catch (error) {
            console.error('Error fetching address:', error);
        } finally {
            setLoading(false);
        }
        return null;
    };

    const [selectedLocationData, setSelectedLocationData] = useState<any>(null);

    const onRegionChangeComplete = async (newRegion: Region) => {
        setRegion(newRegion);
        const data = await fetchAddress(newRegion.latitude, newRegion.longitude);
        setSelectedLocationData(data);
    };

    const handleConfirm = () => {
        if (selectedLocationData) {
            onLocationSelect(selectedLocationData);
            onClose();
        } else {
            // Fallback if user clicked too fast, try fetching current center
            fetchAddress(region.latitude, region.longitude).then((data) => {
                if (data) {
                    onLocationSelect(data);
                    onClose();
                }
            });
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pick Location</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={theme.colors.text} />
                </Pressable>
            </View>

            <View style={styles.mapContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webFallback}>
                        <Text>Map is currently optimized for mobile. On web, please enter address manually.</Text>
                    </View>
                ) : (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_DEFAULT}
                        initialRegion={region}
                        region={region}
                        onRegionChangeComplete={onRegionChangeComplete}
                    />
                )}

                {/* Center Marker Overlay */}
                {Platform.OS !== 'web' && (
                    <View style={styles.markerFixed}>
                        <Ionicons name="location-sharp" size={40} color={theme.colors.primary} style={{ marginBottom: 40 }} />
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.addressContainer}>
                    <Text style={styles.addressLabel}>Selected Address:</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Text style={styles.addressText} numberOfLines={2}>
                            {address || 'Move map to select location'}
                        </Text>
                    )}
                </View>
                <Pressable
                    style={[styles.confirmButton, (!selectedLocationData && !address) && styles.disabledButton]}
                    onPress={handleConfirm}
                    disabled={!selectedLocationData && !address}
                >
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    webFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    markerFixed: {
        position: 'absolute',
        pointerEvents: 'none',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    addressContainer: {
        marginBottom: 16,
    },
    addressLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    confirmButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
