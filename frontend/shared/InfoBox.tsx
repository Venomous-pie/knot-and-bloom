import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type InfoBoxType = 'info' | 'warning' | 'error' | 'success';

interface InfoBoxProps {
    message: string | React.ReactNode;
    type?: InfoBoxType;
    dismissible?: boolean;
    onDismiss?: () => void;
    style?: any;
    storageKey?: string;
}

export default function InfoBox({ message, type = 'info', dismissible = true, onDismiss, style, storageKey }: InfoBoxProps) {
    const [visible, setVisible] = useState(true);
    const [isLoaded, setIsLoaded] = useState(!storageKey);

    useEffect(() => {
        if (storageKey) {
            AsyncStorage.getItem(`infobox_dismissed_${storageKey}`).then(value => {
                if (value === 'true') {
                    setVisible(false);
                }
                setIsLoaded(true);
            }).catch(() => {
                setIsLoaded(true);
            });
        }
    }, [storageKey]);

    if (!isLoaded || !visible) return null;

    const handleDismiss = async () => {
        setVisible(false);
        if (storageKey) {
            try {
                await AsyncStorage.setItem(`infobox_dismissed_${storageKey}`, 'true');
            } catch (e) {
                // Ignore
            }
        }
        if (onDismiss) onDismiss();
    };

    let bgColor = '#E0F2FE';
    let iconColor = '#0284C7';
    let textColor = '#0369A1';
    let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';

    switch (type) {
        case 'warning':
            bgColor = '#FEF3C7';
            iconColor = '#D97706';
            textColor = '#B45309';
            iconName = 'warning';
            break;
        case 'error':
            bgColor = '#FEE2E2';
            iconColor = '#DC2626';
            textColor = '#B91C1C';
            iconName = 'alert-circle';
            break;
        case 'success':
            bgColor = '#D1FAE5';
            iconColor = '#059669';
            textColor = '#047857';
            iconName = 'checkmark-circle';
            break;
        case 'info':
        default:
            break;
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }, style]}>
            <Ionicons name={iconName} size={20} color={iconColor} />
            <View style={styles.textContainer}>
                {typeof message === 'string' ? (
                    <Text style={[styles.text, { color: textColor }]}>{message}</Text>
                ) : (
                    message
                )}
            </View>
            {dismissible && (
                <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color={iconColor} />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    textContainer: {
        flex: 1,
        marginLeft: 8,
    },
    text: {
        fontSize: 14,
    },
    closeButton: {
        marginLeft: 8,
        padding: 4,
    },
});
