/**
 * AddressMapPicker.tsx — WEB version
 *
 * Interactive Leaflet map (OpenStreetMap, no API key).
 * - Blob URL iframe so the document has a proper origin (data: URIs block geolocation)
 * - My Location button in the parent RN layer — calls navigator.geolocation which already
 *   has the user's permission, then postMessages coordinates into the iframe
 * - Tap/click anywhere on the map to drop a draggable pin
 * - Nominatim reverse-geocode on pin placement → auto-fills address fields
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { theme } from '@/constants/theme';
import { MapPin, Navigation, X, Check, AlertCircle } from 'lucide-react-native';

// Philippines center (Manila)
const DEFAULT_LAT = 14.5995;
const DEFAULT_LNG = 120.9842;
const DEFAULT_ZOOM = 6;

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

/** Parse Nominatim response into PH address fields */
function parseNominatimPH(data: any, lat: number, lon: number): MapAddressResult {
    const a = data.address || {};
    const houseNum = a.house_number ? `${a.house_number} ` : '';
    const road = a.road || a.pedestrian || a.path || a.cycleway || '';
    const street = road ? `${houseNum}${road}` : data.display_name?.split(',')[0] || '';
    const barangay = a.suburb || a.village || a.neighbourhood || a.quarter || '';
    const city = a.city || a.town || a.municipality || a.city_district || a.county || '';
    const province = a.state || a.province || '';
    const region = a.region || a.state || '';
    const zipCode = a.postcode || '';
    const country = a.country || 'Philippines';
    return {
        fullAddress: data.display_name || '',
        street, barangay, city, province, region, zipCode, country, lat, lng: lon,
    };
}

/** Build the Leaflet HTML string */
function buildLeafletHTML(initLat: number, initLng: number, zoom: number): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  #map { width: 100%; height: 100%; }
  .leaflet-interactive, .leaflet-container { 
    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>') 12 24, crosshair !important; 
  }
  .custom-pin { display: flex; flex-direction: column; align-items: center; }
  .pin-bubble {
    width: 36px; height: 36px;
    background: #B36979;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(179,105,121,0.5);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .pin-tail {
    width: 0; height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 10px solid #B36979;
    margin-top: -1px;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(179,105,121,0.5); }
    50%       { transform: scale(1.15); box-shadow: 0 6px 20px rgba(179,105,121,0.7); }
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([${initLat}, ${initLng}], ${zoom});
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '\u00a9 OpenStreetMap contributors'
  }).addTo(map);

  var marker = null;

  var pinIcon = L.divIcon({
    className: '',
    html: '<div class="custom-pin"><div class="pin-bubble"><svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="pin-tail"></div></div>',
    iconSize: [36, 46],
    iconAnchor: [18, 46],
  });

  function placePin(latlng) {
    if (marker) {
      marker.setLatLng(latlng);
    } else {
      marker = L.marker(latlng, { icon: pinIcon, draggable: true }).addTo(map);
      marker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        window.parent.postMessage({ type: 'PIN_PLACED', lat: pos.lat, lng: pos.lng }, '*');
      });
    }
    window.parent.postMessage({ type: 'PIN_PLACED', lat: latlng.lat, lng: latlng.lng }, '*');
  }

  map.on('click', function(e) { placePin(e.latlng); });

  // Parent sends GO_TO_LOCATION when My Location resolves
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'GO_TO_LOCATION') {
      var ll = L.latLng(e.data.lat, e.data.lng);
      map.setView(ll, 14);   // city-level zoom
      placePin(ll);
    }
  });
</script>
</body>
</html>`;
}

export const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
    onLocationSelect,
    onClose,
    initialLocation,
}) => {
    const iframeRef = useRef<any>(null);

    const initLat = initialLocation?.lat ?? DEFAULT_LAT;
    const initLng = initialLocation?.lng ?? DEFAULT_LNG;

    // Build the blob URL once — never changes, so the iframe never reloads
    const blobUrl = useMemo(() => {
        const html = buildLeafletHTML(initLat, initLng, DEFAULT_ZOOM);
        const blob = new Blob([html], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Revoke the blob URL when the component unmounts
    useEffect(() => {
        return () => {
            URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl]);

    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
        initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
    );
    const [addressPreview, setAddressPreview] = useState<MapAddressResult | null>(null);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState(false);
    const [locating, setLocating] = useState(false);
    const [highlightAddress, setHighlightAddress] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stable geocode function (doesn't re-create on render)
    const geocodeCoords = useCallback(async (lat: number, lng: number) => {
        setGeocoding(true);
        setGeocodeError(false);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'User-Agent': 'KnotAndBloomApp/1.0 (knotandbloom.ph)' } }
            );
            const data = await res.json();
            if (data?.address) {
                setAddressPreview(parseNominatimPH(data, lat, lng));
                setHighlightAddress(true);
                setShowConfirmModal(true);
                if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
                highlightTimeoutRef.current = setTimeout(() => setHighlightAddress(false), 2000);
            } else {
                setGeocodeError(true);
            }
        } catch {
            setGeocodeError(true);
        } finally {
            setGeocoding(false);
        }
    }, []);

    // Listen for PIN_PLACED messages from the iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'PIN_PLACED') {
                const { lat, lng } = e.data;
                setPin({ lat, lng });
                geocodeCoords(lat, lng);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [geocodeCoords]);

    // If there's an initial location, fly the iframe there once it loads
    const handleIframeLoad = useCallback(() => {
        if (initialLocation) {
            iframeRef.current?.contentWindow?.postMessage(
                { type: 'GO_TO_LOCATION', lat: initialLocation.lat, lng: initialLocation.lng },
                '*'
            );
        }
    }, [initialLocation]);

    // My Location — runs in the parent page context where the user already granted permission
    const handleMyLocation = () => {
        if (!navigator?.geolocation) {
            Alert.alert('Not supported', 'Your browser does not support geolocation.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                // Post to iframe — it will zoom to city level and drop a pin
                iframeRef.current?.contentWindow?.postMessage(
                    { type: 'GO_TO_LOCATION', lat, lng },
                    '*'
                );
                setLocating(false);
            },
            (err) => {
                setLocating(false);
                Alert.alert(
                    'Location unavailable',
                    'Could not get your location. Please place the pin manually on the map.'
                );
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
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

            <Text style={styles.hint}>Click anywhere on the map to place your pin</Text>

            {/* Map + My Location button overlay */}
            <View style={styles.mapContainer}>
                {/* @ts-ignore — iframe renders natively in Expo web */}
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title="Address Map Picker"
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={handleIframeLoad}
                />

                {/* Address Preview Overlay (Top Left) */}
                {pin && (
                    <View style={[
                        styles.addressPreviewOverlay,
                        highlightAddress && styles.addressPreviewHighlight
                    ]}>
                        <Text style={styles.addressLabel}>Selected address</Text>
                        
                        {geocoding ? (
                            <View style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={styles.addressCity}>Finding address…</Text>
                            </View>
                        ) : geocodeError ? (
                            <View style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <AlertCircle size={16} color={theme.colors.error} />
                                <Text style={[styles.addressCity, { color: theme.colors.error }]}>Couldn't find address here.</Text>
                            </View>
                        ) : addressPreview ? (
                            <>
                                <Text style={styles.addressStreet} numberOfLines={1}>
                                    {addressPreview.street || 'Unknown street'}
                                    {addressPreview.barangay ? `, ${addressPreview.barangay}` : ''}
                                </Text>
                                <Text style={styles.addressCity} numberOfLines={1}>
                                    {[addressPreview.city, addressPreview.province, addressPreview.zipCode]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            </>
                        ) : null}
                    </View>
                )}

                {/* Locating overlay */}
                {locating && (
                    <View style={styles.locatingOverlay}>
                        <View style={styles.locatingCard}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.locatingTitle}>Locating you…</Text>
                            <Text style={styles.locatingSubtitle}>
                                Getting your approximate area
                            </Text>
                        </View>
                    </View>
                )}

                {/* My Location button — overlaid on the map, runs geolocation from the parent page */}
                <Pressable
                    style={styles.myLocationBtn}
                    onPress={handleMyLocation}
                    // @ts-ignore — cursor style for web
                    cursor="pointer"
                >
                    {locating ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Navigation size={24} color={theme.colors.primary} />
                    )}
                </Pressable>

                {/* Confirmation Modal */}
                {showConfirmModal && addressPreview && (
                    <View style={styles.confirmModalOverlay}>
                        <View style={styles.confirmModalCard}>
                            <View style={styles.confirmModalHeader}>
                                <MapPin size={24} color={theme.colors.primary} />
                                <Text style={styles.confirmModalTitle}>Location Found</Text>
                            </View>
                            <View style={styles.confirmModalBody}>
                                <Text style={styles.confirmModalStreet}>
                                    {addressPreview.street || 'Unknown street'}
                                    {addressPreview.barangay ? `, ${addressPreview.barangay}` : ''}
                                </Text>
                                <Text style={styles.confirmModalCity}>
                                    {[addressPreview.city, addressPreview.province, addressPreview.zipCode]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            </View>
                            <View style={styles.confirmModalActions}>
                                <Pressable
                                    style={styles.confirmModalSecondaryBtn}
                                    onPress={() => setShowConfirmModal(false)}
                                >
                                    <Text style={styles.confirmModalSecondaryText}>Adjust Pin</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.confirmModalPrimaryBtn}
                                    onPress={handleConfirm}
                                >
                                    <Check size={18} color="#fff" />
                                    <Text style={styles.confirmModalPrimaryText}>Use This Address</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}
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
        overflow: 'hidden',
    },
    locatingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
        // subtle backdrop blur on web
        ...({ backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' } as any),
    },
    locatingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        paddingHorizontal: 28,
        paddingVertical: 24,
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
        minWidth: 200,
    },
    locatingTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    locatingSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textAlign: 'center',
    },
    myLocationBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        // Web-only shadow
        ...({ boxShadow: '0 2px 10px rgba(0,0,0,0.22)' } as any),
    },
    footer: {
        padding: 16,
        paddingBottom: 24,
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
    addressPreviewOverlay: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        maxWidth: '75%',
        zIndex: 10,
        borderWidth: 2,
        borderColor: 'transparent',
        ...theme.shadows.md,
        // Web-only shadow
        ...({ boxShadow: '0 2px 10px rgba(0,0,0,0.12)' } as any),
    },
    addressPreviewHighlight: {
        borderColor: theme.colors.primary,
    },
    addressLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    addressStreet: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 2,
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
    },
    confirmBtnDisabled: {
        backgroundColor: theme.colors.border,
    },
    confirmText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        fontFamily: theme.typography.fontFamily,
    },
    confirmModalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    confirmModalCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 20,
        width: '85%',
        maxWidth: 400,
        padding: 24,
        ...theme.shadows.lg,
        ...({ boxShadow: '0 8px 30px rgba(0,0,0,0.2)' } as any),
    },
    confirmModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    confirmModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    confirmModalBody: {
        backgroundColor: theme.colors.subtle,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    confirmModalStreet: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
        marginBottom: 4,
    },
    confirmModalCity: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    confirmModalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmModalSecondaryBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.subtle,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalSecondaryText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    confirmModalPrimaryBtn: {
        flex: 1.5,
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmModalPrimaryText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        fontFamily: theme.typography.fontFamily,
    },
});

export default AddressMapPicker;
