import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    Image,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { X, Check, SkipForward, Crop, Square, RectangleHorizontal } from 'lucide-react-native';
import { cropImage } from '@/lib/imagekit';

interface ImageCropperModalProps {
    visible: boolean;
    imageUri: string | null;
    onCrop: (croppedUri: string) => void;
    onSkip: () => void;
    onCancel: () => void;
}

interface AspectRatioOption {
    id: string;
    label: string;
    ratio: number | null; // null = free
    icon: React.ReactNode;
}

const ASPECT_RATIOS: AspectRatioOption[] = [
    { id: 'square', label: '1:1', ratio: 1, icon: <Square size={16} color="#333" /> },
    { id: '4:3', label: '4:3', ratio: 4 / 3, icon: <RectangleHorizontal size={16} color="#333" /> },
    { id: '16:9', label: '16:9', ratio: 16 / 9, icon: <RectangleHorizontal size={16} color="#333" /> },
    { id: 'free', label: 'Free', ratio: null, icon: <Crop size={16} color="#333" /> },
];

export default function ImageCropperModal({
    visible,
    imageUri,
    onCrop,
    onSkip,
    onCancel,
}: ImageCropperModalProps) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(ASPECT_RATIOS[0]);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [loading, setLoading] = useState(false);

    // Calculate max preview size
    const maxPreviewWidth = Math.min(screenWidth - 48, 600);
    const maxPreviewHeight = screenHeight * 0.5;

    useEffect(() => {
        if (imageUri) {
            Image.getSize(
                imageUri,
                (width, height) => {
                    setImageSize({ width, height });
                    updateCropArea(width, height, selectedRatio.ratio);
                },
                (error) => console.error('Failed to get image size:', error)
            );
        }
    }, [imageUri]);

    const updateCropArea = (imgWidth: number, imgHeight: number, ratio: number | null) => {
        if (!ratio) {
            // Free crop - use full image
            setCropArea({ x: 0, y: 0, width: imgWidth, height: imgHeight });
            return;
        }

        const imgRatio = imgWidth / imgHeight;
        let cropWidth, cropHeight;

        if (imgRatio > ratio) {
            // Image is wider than desired ratio
            cropHeight = imgHeight;
            cropWidth = imgHeight * ratio;
        } else {
            // Image is taller than desired ratio
            cropWidth = imgWidth;
            cropHeight = imgWidth / ratio;
        }

        // Center the crop area
        const x = (imgWidth - cropWidth) / 2;
        const y = (imgHeight - cropHeight) / 2;

        setCropArea({ x, y, width: cropWidth, height: cropHeight });
    };

    const handleRatioChange = (ratioOption: AspectRatioOption) => {
        setSelectedRatio(ratioOption);
        if (imageSize.width && imageSize.height) {
            updateCropArea(imageSize.width, imageSize.height, ratioOption.ratio);
        }
    };

    const handleCrop = async () => {
        if (!imageUri) return;

        setLoading(true);
        try {
            const croppedUri = await cropImage(imageUri, {
                originX: Math.round(cropArea.x),
                originY: Math.round(cropArea.y),
                width: Math.round(cropArea.width),
                height: Math.round(cropArea.height),
            });
            onCrop(croppedUri);
        } catch (error) {
            console.error('Crop failed:', error);
            onSkip(); // Fall back to original on error
        } finally {
            setLoading(false);
        }
    };

    // Calculate display dimensions
    const displayScale = Math.min(
        maxPreviewWidth / imageSize.width,
        maxPreviewHeight / imageSize.height,
        1
    );
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;

    // Crop overlay dimensions
    const cropDisplayX = cropArea.x * displayScale;
    const cropDisplayY = cropArea.y * displayScale;
    const cropDisplayWidth = cropArea.width * displayScale;
    const cropDisplayHeight = cropArea.height * displayScale;

    if (!visible || !imageUri) return null;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable style={styles.closeButton} onPress={onCancel}>
                            <X size={20} color="#666" />
                        </Pressable>
                        <Text style={styles.title}>Crop Image</Text>
                        <Pressable style={styles.skipButton} onPress={onSkip}>
                            <SkipForward size={16} color="#B36979" />
                            <Text style={styles.skipText}>Skip</Text>
                        </Pressable>
                    </View>

                    {/* Image Preview with Crop Overlay */}
                    <View style={styles.previewContainer}>
                        {imageSize.width > 0 ? (
                            <View style={{ width: displayWidth, height: displayHeight, position: 'relative' }}>
                                <Image
                                    source={{ uri: imageUri }}
                                    style={{ width: displayWidth, height: displayHeight }}
                                    resizeMode="contain"
                                />
                                {/* Darkened areas outside crop */}
                                <View style={[styles.cropOverlay, { top: 0, left: 0, right: 0, height: cropDisplayY }]} />
                                <View style={[styles.cropOverlay, { bottom: 0, left: 0, right: 0, height: displayHeight - cropDisplayY - cropDisplayHeight }]} />
                                <View style={[styles.cropOverlay, { top: cropDisplayY, left: 0, width: cropDisplayX, height: cropDisplayHeight }]} />
                                <View style={[styles.cropOverlay, { top: cropDisplayY, right: 0, width: displayWidth - cropDisplayX - cropDisplayWidth, height: cropDisplayHeight }]} />
                                {/* Crop border */}
                                <View style={[styles.cropBorder, {
                                    left: cropDisplayX,
                                    top: cropDisplayY,
                                    width: cropDisplayWidth,
                                    height: cropDisplayHeight,
                                }]} />
                            </View>
                        ) : (
                            <ActivityIndicator size="large" color="#B36979" />
                        )}
                    </View>

                    {/* Aspect Ratio Options */}
                    <View style={styles.ratioContainer}>
                        {ASPECT_RATIOS.map((ratio) => (
                            <Pressable
                                key={ratio.id}
                                style={[
                                    styles.ratioButton,
                                    selectedRatio.id === ratio.id && styles.ratioButtonSelected,
                                ]}
                                onPress={() => handleRatioChange(ratio)}
                            >
                                {ratio.icon}
                                <Text style={[
                                    styles.ratioText,
                                    selectedRatio.id === ratio.id && styles.ratioTextSelected,
                                ]}>{ratio.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            style={[styles.actionButton, styles.cropButton, loading && styles.buttonDisabled]}
                            onPress={handleCrop}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Check size={18} color="white" />
                                    <Text style={styles.cropButtonText}>Apply Crop</Text>
                                </>
                            )}
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
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 16,
        maxWidth: 650,
        width: '100%',
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    skipText: {
        fontSize: 14,
        color: '#B36979',
        fontWeight: '500',
    },
    previewContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    cropOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cropBorder: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#B36979',
        borderStyle: 'dashed',
    },
    ratioContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    ratioButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    ratioButtonSelected: {
        backgroundColor: '#FCF0F2',
        borderColor: '#B36979',
    },
    ratioText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    ratioTextSelected: {
        color: '#B36979',
        fontWeight: '600',
    },
    actions: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    cropButton: {
        backgroundColor: '#B36979',
    },
    cropButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
