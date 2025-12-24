import { isMobile } from '@/constants/layout';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Trash2, Link as LinkIcon, X, Clipboard } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import ImageCropperModal from './ImageCropperModal';
import { uploadToImageKit, compressImage } from '@/lib/imagekit';

interface ImageItem {
    uri: string;
    isUrl?: boolean;
}

interface ImageUploaderProps {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    maxImages?: number;
}

export default function ImageUploader({ images, onImagesChange, maxImages = 5 }: ImageUploaderProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const containerRef = useRef<View>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [urlInputFocused, setUrlInputFocused] = useState(false);

    // Crop modal state
    const [showCropModal, setShowCropModal] = useState(false);
    const [pendingImages, setPendingImages] = useState<{ uri: string; name?: string }[]>([]);
    const [currentCropIndex, setCurrentCropIndex] = useState(0);

    const imageSize = mobile ? (width - 60) / 2 : 150;
    const canAddMore = images.length < maxImages;

    // Setup paste listener for web
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handlePaste = async (e: ClipboardEvent) => {
            if (!canAddMore) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        const uri = URL.createObjectURL(file);
                        setPendingImages([{ uri, name: file.name }]);
                        setCurrentCropIndex(0);
                        setShowCropModal(true);
                    }
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [canAddMore, images.length, maxImages]);

    const pickImages = async () => {
        if (images.length >= maxImages) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: maxImages - images.length,
        });

        if (!result.canceled && result.assets) {
            const picked = result.assets.map(asset => ({
                uri: asset.uri,
                name: asset.fileName || `image_${Date.now()}.jpg`,
            }));
            setPendingImages(picked);
            setCurrentCropIndex(0);
            setShowCropModal(true);
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        const current = pendingImages[currentCropIndex];
        await processAndUploadImage(croppedUri, current?.name);

        // Move to next image or close
        if (currentCropIndex < pendingImages.length - 1) {
            setCurrentCropIndex(currentCropIndex + 1);
        } else {
            setShowCropModal(false);
            setPendingImages([]);
            setCurrentCropIndex(0);
        }
    };

    const handleCropSkip = async () => {
        const current = pendingImages[currentCropIndex];
        if (current) {
            await processAndUploadImage(current.uri, current.name);
        }

        // Move to next image or close
        if (currentCropIndex < pendingImages.length - 1) {
            setCurrentCropIndex(currentCropIndex + 1);
        } else {
            setShowCropModal(false);
            setPendingImages([]);
            setCurrentCropIndex(0);
        }
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setPendingImages([]);
        setCurrentCropIndex(0);
    };

    const processAndUploadImage = async (uri: string, name?: string) => {
        setUploading(true);
        setUploadProgress('Compressing...');

        try {
            // Compress if needed
            const compressedUri = await compressImage(uri);

            setUploadProgress('Uploading...');

            // Upload to ImageKit
            const result = await uploadToImageKit({
                uri: compressedUri,
                name: name || `image_${Date.now()}.jpg`,
            });

            onImagesChange([...images, { uri: result.url, isUrl: true }]);
        } catch (error) {
            console.error('Upload failed:', error);
            // Fallback to local URI if upload fails
            onImagesChange([...images, { uri, isUrl: false }]);
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };

    const addUrlImage = () => {
        if (!urlInput.trim()) return;
        if (images.length >= maxImages) return;

        onImagesChange([...images, { uri: urlInput.trim(), isUrl: true }]);
        setUrlInput('');
        setShowUrlInput(false);
    };

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        onImagesChange(newImages);
    };

    const moveImage = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= images.length) return;
        const newImages = [...images];
        const [moved] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, moved);
        onImagesChange(newImages);
    };

    // Empty state - centered
    const isEmpty = images.length === 0;

    return (
        <View style={styles.container} ref={containerRef}>
            <View style={styles.header}>
                <Text style={styles.title}>Product Images</Text>
                <Text style={styles.subtitle}>{images.length}/{maxImages} images</Text>
            </View>

            {/* Image Grid - Centered when empty */}
            <View style={[
                styles.imageGridContainer,
                isEmpty && styles.imageGridContainerEmpty
            ]}>
                <ScrollView
                    horizontal={!mobile}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                        mobile ? styles.gridContainer : styles.rowContainer,
                        isEmpty && styles.containerCentered
                    ]}
                >
                    {/* Existing Images */}
                    {images.map((image, index) => (
                        <View
                            key={index}
                            style={[
                                styles.imageWrapper,
                                { width: imageSize, height: imageSize },
                                index === 0 && styles.primaryImage,
                            ]}
                        >
                            <Image
                                source={{ uri: image.uri }}
                                style={styles.image}
                                resizeMode="cover"
                            />

                            {/* Primary Badge */}
                            {index === 0 && (
                                <View style={styles.primaryBadge}>
                                    <Text style={styles.primaryBadgeText}>Primary</Text>
                                </View>
                            )}

                            {/* Actions Overlay */}
                            <View style={styles.actionsOverlay}>
                                {index > 0 && (
                                    <Pressable
                                        style={styles.actionButton}
                                        onPress={() => moveImage(index, index - 1)}
                                    >
                                        <Text style={styles.actionText}>←</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => removeImage(index)}
                                >
                                    <Trash2 size={14} color="#fff" />
                                </Pressable>
                                {index < images.length - 1 && (
                                    <Pressable
                                        style={styles.actionButton}
                                        onPress={() => moveImage(index, index + 1)}
                                    >
                                        <Text style={styles.actionText}>→</Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    ))}

                    {/* Add Button - Larger when empty */}
                    {canAddMore && !uploading && (
                        <Pressable
                            style={[
                                styles.addButton,
                                {
                                    width: isEmpty ? imageSize * 1.5 : imageSize,
                                    height: isEmpty ? imageSize * 1.5 : imageSize
                                }
                            ]}
                            onPress={pickImages}
                        >
                            <ImagePlus size={isEmpty ? 36 : 28} color="#B36979" />
                            <Text style={[styles.addButtonText, isEmpty && styles.addButtonTextLarge]}>
                                Add Image
                            </Text>
                            <Text style={styles.addButtonHint}>
                                {Platform.OS === 'web' ? 'or paste (Ctrl+V)' : 'or drag & drop'}
                            </Text>
                        </Pressable>
                    )}

                    {/* Uploading Indicator */}
                    {uploading && (
                        <View style={[styles.addButton, { width: imageSize, height: imageSize }]}>
                            <ActivityIndicator size="large" color="#B36979" />
                            <Text style={styles.addButtonText}>{uploadProgress || 'Uploading...'}</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* URL Input Toggle */}
            <View style={styles.urlSection}>
                {!showUrlInput ? (
                    <Pressable
                        style={styles.urlToggle}
                        onPress={() => setShowUrlInput(true)}
                        disabled={!canAddMore}
                    >
                        <LinkIcon size={16} color={canAddMore ? "#B36979" : "#ccc"} />
                        <Text style={[styles.urlToggleText, !canAddMore && { color: '#ccc' }]}>
                            Add image from URL
                        </Text>
                    </Pressable>
                ) : (
                    <View style={styles.urlInputContainer}>
                        <TextInput
                            style={[styles.urlInput, urlInputFocused && styles.urlInputFocused]}
                            placeholder="https://example.com/image.jpg"
                            placeholderTextColor="#999"
                            value={urlInput}
                            onChangeText={setUrlInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onFocus={() => setUrlInputFocused(true)}
                            onBlur={() => setUrlInputFocused(false)}
                        />
                        <Pressable style={styles.urlAddButton} onPress={addUrlImage}>
                            <Text style={styles.urlAddButtonText}>Add</Text>
                        </Pressable>
                        <Pressable style={styles.urlCancelButton} onPress={() => setShowUrlInput(false)}>
                            <X size={18} color="#666" />
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Helper Text */}
            <Text style={styles.helperText}>
                First image will be the primary product photo.
                {Platform.OS === 'web' ? ' Paste images with Ctrl+V.' : ' Drag to reorder.'}
            </Text>

            {/* Crop Modal */}
            <ImageCropperModal
                visible={showCropModal}
                imageUri={pendingImages[currentCropIndex]?.uri || null}
                onCrop={handleCropComplete}
                onSkip={handleCropSkip}
                onCancel={handleCropCancel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        fontFamily: 'Quicksand',
    },
    subtitle: {
        fontSize: 13,
        color: '#888',
        fontFamily: 'Quicksand',
    },
    imageGridContainer: {
        minHeight: 170,
    },
    imageGridContainerEmpty: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 8,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingVertical: 8,
    },
    containerCentered: {
        justifyContent: 'center',
        flex: 1,
    },
    imageWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    primaryImage: {
        borderWidth: 2,
        borderColor: '#B36979',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    primaryBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#B36979',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    primaryBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    actionsOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        padding: 8,
    },
    actionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#E53935',
    },
    actionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    addButton: {
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        gap: 6,
    },
    addButtonText: {
        fontSize: 13,
        color: '#B36979',
        fontWeight: '600',
        fontFamily: 'Quicksand',
    },
    addButtonTextLarge: {
        fontSize: 15,
    },
    addButtonHint: {
        fontSize: 11,
        color: '#aaa',
        fontFamily: 'Quicksand',
    },
    urlSection: {
        marginTop: 8,
    },
    urlToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    urlToggleText: {
        fontSize: 13,
        color: '#B36979',
        fontFamily: 'Quicksand',
    },
    urlInputContainer: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    urlInput: {
        flex: 1,
        height: 44,
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 12,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: '#FAFAFA',
        color: '#333',
        outlineStyle: 'none' as any,
    },
    urlInputFocused: {
        borderColor: '#B36979',
        backgroundColor: 'white',
    },
    urlAddButton: {
        backgroundColor: '#B36979',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    urlAddButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    urlCancelButton: {
        padding: 8,
    },
    helperText: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        fontFamily: 'Quicksand',
    },
});
