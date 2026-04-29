import { isMobile } from '@/constants/layout';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Trash2, Crop } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import ImageCropperModal from './ImageCropperModal';
import { uploadToImageKit, compressImage } from '@/lib/imagekit';
import { theme } from '@/constants/theme';

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
                        setUploading(true);
                        setUploadProgress('Uploading pasted image...');
                        const uploaded = await uploadSingleImage(uri, file.name);
                        if (uploaded) {
                            onImagesChange([...images, uploaded]);
                        }
                        setUploading(false);
                        setUploadProgress('');
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
            setUploading(true);
            setUploadProgress('Uploading...');
            
            const newImages: ImageItem[] = [];
            for (const asset of result.assets) {
                const uploaded = await uploadSingleImage(asset.uri, asset.fileName || `image_${Date.now()}.jpg`);
                if (uploaded) newImages.push(uploaded);
            }
            
            onImagesChange([...images, ...newImages]);
            setUploading(false);
            setUploadProgress('');
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        const current = pendingImages[0];
        setShowCropModal(false);
        setUploading(true);
        setUploadProgress('Applying crop...');
        
        const uploaded = await uploadSingleImage(croppedUri, current?.name);
        if (uploaded) {
            const newImages = [...images];
            newImages[currentCropIndex] = uploaded;
            onImagesChange(newImages);
        }
        
        setPendingImages([]);
        setCurrentCropIndex(0);
        setUploading(false);
        setUploadProgress('');
    };

    const handleCropSkip = () => {
        setShowCropModal(false);
        setPendingImages([]);
        setCurrentCropIndex(0);
    };

    const handleCropCancel = () => {
        setShowCropModal(false);
        setPendingImages([]);
        setCurrentCropIndex(0);
    };
    
    const openCropper = (index: number) => {
        setPendingImages([{ uri: images[index].uri }]);
        setCurrentCropIndex(index);
        setShowCropModal(true);
    };

    const uploadSingleImage = async (uri: string, name?: string): Promise<ImageItem | null> => {
        try {
            const compressedUri = await compressImage(uri);
            const result = await uploadToImageKit({
                uri: compressedUri,
                name: name || `image_${Date.now()}.jpg`,
            });
            return { uri: result.url, isUrl: true };
        } catch (error) {
            console.error('Upload failed:', error);
            return { uri, isUrl: false };
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
            {/* Header info is moved to parent or kept minimal */}
            {isEmpty ? (
                <Pressable
                    style={styles.emptyDropzone}
                    onPress={pickImages}
                >
                    <View style={styles.iconContainer}>
                        <ImagePlus size={40} color="#B36979" />
                    </View>
                    <Text style={styles.dropzoneTitle}>Upload Product Images</Text>
                    <Text style={styles.dropzoneSubtitle}>
                        {Platform.OS === 'web' ? 'Click to browse, drag & drop, or paste (Ctrl+V)' : 'Tap to browse your photos'}
                    </Text>
                    <Text style={styles.dropzoneLimit}>Up to {maxImages} images • PNG, JPG</Text>
                </Pressable>
            ) : (
                <View style={styles.populatedContainer}>
                    <View style={styles.header}>
                        <Text style={styles.subtitle}>{images.length}/{maxImages} images uploaded</Text>
                    </View>
                    
                    <View style={styles.gridContainer}>
                        {images.map((image, index) => {
                            const isPrimary = index === 0;
                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.imageWrapper,
                                        isPrimary ? styles.primaryImageWrapper : styles.secondaryImageWrapper
                                    ]}
                                >
                                    <Image
                                        source={{ uri: image.uri }}
                                        style={styles.image}
                                        resizeMode="cover"
                                    />
                                    
                                    {isPrimary && (
                                        <View style={styles.primaryBadge}>
                                            <Text style={styles.primaryBadgeText}>Primary</Text>
                                        </View>
                                    )}

                                    <View style={styles.actionsOverlay}>
                                        {index > 0 && (
                                            <Pressable style={styles.actionButton} onPress={() => moveImage(index, index - 1)}>
                                                <Text style={styles.actionText}>←</Text>
                                            </Pressable>
                                        )}
                                        <Pressable style={styles.actionButton} onPress={() => openCropper(index)}>
                                            <Crop size={14} color="#333" />
                                        </Pressable>
                                        <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => removeImage(index)}>
                                            <Trash2 size={14} color={theme.colors.primary} />
                                        </Pressable>
                                        {index < images.length - 1 && (
                                            <Pressable style={styles.actionButton} onPress={() => moveImage(index, index + 1)}>
                                                <Text style={styles.actionText}>→</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                        
                        {canAddMore && !uploading && (
                            <Pressable 
                                style={[styles.secondaryImageWrapper, styles.uploadingWrapper, { borderColor: '#E8D5D9', backgroundColor: '#FCFAFA' }]} 
                                onPress={pickImages}
                            >
                                <ImagePlus size={24} color="#B36979" />
                                <Text style={[styles.uploadingText, { color: '#B36979', marginTop: 4 }]}>Add</Text>
                            </Pressable>
                        )}

                        {uploading && (
                            <View style={[styles.secondaryImageWrapper, styles.uploadingWrapper]}>
                                <ActivityIndicator size="large" color="#B36979" />
                                <Text style={styles.uploadingText}>{uploadProgress || 'Uploading...'}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

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
        gap: 16,
    },
    emptyDropzone: {
        borderWidth: 2,
        borderColor: '#E8D5D9',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FCFAFA',
        minHeight: 200,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F7EEF0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    dropzoneTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#B36979',
        marginBottom: 8,
    },
    dropzoneSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 8,
        textAlign: 'center',
    },
    dropzoneLimit: {
        fontSize: 12,
        color: '#AAA',
    },
    populatedContainer: {
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    smallAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7EEF0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    smallAddText: {
        fontSize: 13,
        color: '#B36979',
        fontWeight: '600',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    imageWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    primaryImageWrapper: {
        width: 100,
        height: 100,
        borderWidth: 2,
        borderColor: '#B36979',
    },
    secondaryImageWrapper: {
        width: 100,
        height: 100,
        borderWidth: 1,
        borderColor: '#E8D5D9',
    },
    uploadingWrapper: {
        width: 100,
        height: 100,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa',
    },
    uploadingText: {
        fontSize: 11,
        color: '#B36979',
        marginTop: 8,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    primaryBadge: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: '#B36979',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    primaryBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    actionsOverlay: {
        position: 'absolute',
        bottom: 4,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    actionButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    deleteButton: {
        backgroundColor: '#FFF',
    },
    actionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: 'bold',
    },
    urlSection: {
        marginTop: 4,
    },
    urlToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    urlToggleText: {
        fontSize: 14,
        color: '#B36979',
        fontWeight: '500',
    },
    urlInputContainer: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    urlInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingHorizontal: 14,
        fontSize: 14,
        backgroundColor: '#FFF',
        color: '#333',
        outlineStyle: 'none' as any,
    },
    urlInputFocused: {
        borderColor: '#B36979',
    },
    urlAddButton: {
        backgroundColor: '#B36979',
        paddingHorizontal: 16,
        height: 44,
        justifyContent: 'center',
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
});
