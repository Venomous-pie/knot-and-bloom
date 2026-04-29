import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View, Pressable, TextInput } from 'react-native';
import ColorPicker, { Panel1, Swatches, Preview, OpacitySlider, HueSlider } from 'reanimated-color-picker';
import { X, Check, Plus, Pipette } from 'lucide-react-native';

interface ColorPickerModalProps {
    visible: boolean;
    initialColor?: string;
    onClose: () => void;
    onSelect: (color: string) => void;
    onSaveToPalette?: (color: string) => void;
}

export default function ColorPickerModal({
    visible,
    initialColor = '#B36979',
    onClose,
    onSelect,
    onSaveToPalette
}: ColorPickerModalProps) {
    const [selectedColor, setSelectedColor] = useState(initialColor);
    const [eyedropperAvailable, setEyedropperAvailable] = useState(false);

    React.useEffect(() => {
        // Check for EyeDropper API support on web
        if (typeof window !== 'undefined' && 'EyeDropper' in window) {
            setEyedropperAvailable(true);
        }
    }, []);

    const onColorChange = (color: { hex: string }) => {
        setSelectedColor(color.hex);
    };

    const handleEyedropper = async () => {
        // @ts-ignore - EyeDropper is not yet in standard lib types
        if (!window.EyeDropper) return;

        try {
            // @ts-ignore
            const eyeDropper = new window.EyeDropper();
            const result = await eyeDropper.open();
            setSelectedColor(result.sRGBHex);
        } catch (e) {
            console.log('Eyedropper cancelled or failed', e);
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Color</Text>
                        <View style={styles.headerButtons}>
                            {eyedropperAvailable && (
                                <Pressable
                                    onPress={handleEyedropper}
                                    style={styles.iconButton}
                                >
                                    <Pipette size={20} color="#666" />
                                </Pressable>
                            )}
                            <Pressable onPress={onClose} style={styles.closeButton}>
                                <X size={20} color="#666" />
                            </Pressable>
                        </View>
                    </View>

                    <ColorPicker
                        style={styles.picker}
                        value={selectedColor}
                        onComplete={onColorChange}
                    >
                        <Preview style={styles.preview} hideInitialColor />
                        <Panel1 style={styles.panel} />
                        <HueSlider style={styles.slider} />
                        <OpacitySlider style={styles.slider} />
                    </ColorPicker>

                    <View style={styles.footer}>
                        {onSaveToPalette && (
                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => {
                                    onSaveToPalette(selectedColor);
                                    // Optional: show toast/feedback
                                }}
                            >
                                <Plus size={18} color="#B36979" />
                                <Text style={styles.secondaryButtonText}>Save to Palette</Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => {
                                onSelect(selectedColor);
                                onClose();
                            }}
                        >
                            <Text style={styles.primaryButtonText}>Select Color</Text>
                            <Check size={18} color="white" />
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    picker: {
        width: '100%',
        gap: 16,
    },
    panel: {
        height: 180,
        borderRadius: 12,
    },
    slider: {
        height: 30,
        borderRadius: 15,
    },
    preview: {
        height: 40,
        borderRadius: 8,
        marginBottom: 10,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        gap: 12,
    },
    primaryButton: {
        flex: 1,
        backgroundColor: '#B36979',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 8,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#FDF2F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E8D5D9',
    },
    secondaryButtonText: {
        color: '#B36979',
        fontSize: 14,
        fontWeight: '600',
    },
});
