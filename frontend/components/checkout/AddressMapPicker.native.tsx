import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    ActivityIndicator,
    Text,
    Pressable,
    Alert,
    Animated,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '@/constants/theme';
import { MapPin, Navigation, X, Check } from 'lucide-react-native';

// Philippines center (Manila)
const MANILA: Region = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
};

export interface MapAddressResult {
    fullAddress: string;
    street: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
    zipCode: string;
    country: string;
    lat: number;
    lng: number;
}

interface AddressMapPickerProps {
    onLocationSelect: (address: MapAddressResult) => void;
    onClose: () => void;
    initialLocation?: { lat: number; lng: number };
}

/** Parse a Nominatim reverse-geocode response into PH address fields */
function parseNominatimPH(data: any, lat: number, lon: number): MapAddressResult {
    const a = data.address || {};

    // Street: prefer road, then pedestrian, then path
    const houseNum = a.house_number ? `${a.house_number} ` : '';
    const road = a.road || a.pedestrian || a.path || a.cycleway || '';
    const street = road ? `${houseNum}${road}` : data.display_name?.split(',')[0] || '';

    // Barangay: suburb, village, neighbourhood, quarter
    const barangay = a.suburb || a.village || a.neighbourhood || a.quarter || '';

    // City / municipality
    const city =
        a.city ||
        a.town ||
        a.municipality ||
        a.city_district ||
        a.county ||
        '';

    // Province / state
    const province = a.state || a.province || '';

    // Region (PH Nominatim sometimes puts region in state; fallback to country)
    const region = a.region || a.state || '';

    const zipCode = a.postcode || '';
    const country = a.country || 'Philippines';

    return {
        fullAddress: data.display_name || '',
        street,
        barangay,
        city,
        province,
        region,
        zipCode,
        country,
        lat,
        lng: lon,
    };
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
    onLocationSelect,
    onClose,
    initialLocation,
}) => {
    const mapRef = useRef<MapView>(null);

    const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
        initialLocation
            ? { latitude: initialLocation.lat, longitude: initialLocation.lng }
            : null
    );

    const [addressPreview, setAddressPreview] = useState<MapAddressResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [locating, setLocating] = useState(false);

    // Pulse animation for the pin
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (pin) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
                ])
            ).start();
            geocodePin(pin.latitude, pin.longitude);
        }
    }, [pin]);

    // On mount, try to get device location; fall back to Manila
    useEffect(() => {
        if (initialLocation) {
            setPin({ latitude: initialLocation.lat, longitude: initialLocation.lng });
            return;
        }
        (async () => {
            setLocating(true);
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const newPin = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    setPin(newPin);
                    mapRef.current?.animateToRegion({
                        ...newPin,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }, 800);
                }
            } catch {
                // Permission denied or unavailable — stay at Manila default
            } finally {
                setLocating(false);
            }
        })();
    }, []);

    const geocodePin = async (lat: number, lon: number) => {
        setGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
                { headers: { 'User-Agent': 'KnotAndBloomApp/1.0 (knotandbloom.ph)' } }
            );
            const data = await res.json();
            if (data && data.address) {
                setAddressPreview(parseNominatimPH(data, lat, lon));
            }
        } catch {
            setAddressPreview(null);
        } finally {
            setGeocoding(false);
        }
    };

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setPin({ latitude, longitude });
    };

    const handleMyLocation = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access in Settings to use this feature.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const newPin = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setPin(newPin);
            mapRef.current?.animateToRegion(
                { ...newPin, latitudeDelta: 0.01, longitudeDelta: 0.01 },
                800
            );
        } catch {
            Alert.alert('Error', 'Could not get your location. Please try again.');
        } finally {
            setLocating(false);
        }
    };

    const handleConfirm = () => {
        if (addressPreview) {
            onLocationSelect(addressPreview);
            onClose();
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MapPin size={20} color={theme.colors.primary} />
                    <Text style={styles.headerTitle}>Drop a Pin</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                    <X size={22} color={theme.colors.text} />
                </Pressable>
            </View>

            <Text style={styles.hint}>Tap anywhere on the map to place your pin</Text>

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={
                        initialLocation
                            ? {
                                latitude: initialLocation.lat,
                                longitude: initialLocation.lng,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                              }
                            : MANILA
                    }
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    {pin && (
                        <Marker coordinate={pin} anchor={{ x: 0.5, y: 1 }}>
                            <Animated.View style={[styles.markerContainer, { transform: [{ scale: pulseAnim }] }]}>
                                <View style={styles.markerBubble}>
                                    <MapPin size={18} color="#fff" fill="#fff" />
                                </View>
                                <View style={styles.markerTail} />
                            </Animated.View>
                        </Marker>
                    )}
                </MapView>

                {/* My Location Button */}
                <Pressable style={styles.myLocationBtn} onPress={handleMyLocation}>
                    {locating ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Navigation size={20} color={theme.colors.primary} />
                    )}
                </Pressable>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                {!pin ? (
                    <View style={styles.emptyPin}>
                        <MapPin size={18} color={theme.colors.textLight} />
                        <Text style={styles.emptyPinText}>Tap the map to place your pin</Text>
                    </View>
                ) : geocoding ? (
                    <View style={styles.geocodingRow}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.geocodingText}>Finding address…</Text>
                    </View>
                ) : addressPreview ? (
                    <View style={styles.addressPreview}>
                        <Text style={styles.addressLabel}>Selected address</Text>
                        <Text style={styles.addressStreet} numberOfLines={1}>
                            {addressPreview.street || 'Unknown street'}
                            {addressPreview.barangay ? `, ${addressPreview.barangay}` : ''}
                        </Text>
                        <Text style={styles.addressCity} numberOfLines={1}>
                            {[addressPreview.city, addressPreview.province, addressPreview.zipCode]
                                .filter(Boolean)
                                .join(', ')}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.geocodingText}>Could not detect address</Text>
                )}

                <Pressable
                    style={[styles.confirmBtn, (!pin || geocoding) && styles.confirmBtnDisabled]}
                    onPress={handleConfirm}
                    disabled={!pin || geocoding}
                >
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmText}>Use This Location</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    closeBtn: {
        padding: 4,
    },
    hint: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textAlign: 'center',
        paddingVertical: 8,
        backgroundColor: theme.colors.subtle,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    markerTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: theme.colors.primary,
        marginTop: -1,
    },
    myLocationBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    footer: {
        padding: 16,
        paddingBottom: 28,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        gap: 12,
    },
    emptyPin: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    emptyPinText: {
        fontSize: 14,
        color: theme.colors.textLight,
        fontFamily: theme.typography.fontFamily,
        fontStyle: 'italic',
    },
    geocodingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    geocodingText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    addressPreview: {
        gap: 2,
    },
    addressLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    addressStreet: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    addressCity: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnDisabled: {
        backgroundColor: theme.colors.border,
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        fontFamily: theme.typography.fontFamily,
    },
});

export default AddressMapPicker;
