import { isMobile } from '@/constants/layout';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, Trash2, Crop } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import ImageCropperModal from './ImageCropperModal';
import { compressImage, uploadToImageKit } from '@/lib/imagekit';
import { theme } from '@/constants/theme';
import { useDialog } from '@/contexts/DialogContext';

interface ImageItem {
    uri: string;
    isUrl?: boolean;
}

interface ImageUploaderProps {
    images: ImageItem[];
    onImagesChange: (images: ImageItem[]) => void;
    maxImages?: number;
    compact?: boolean;
}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, compact = false }: ImageUploaderProps) {
    const { width } = useWindowDimensions();
    const mobile = isMobile(width);
    const containerRef = useRef<View>(null);

    const [uploadingImages, setUploadingImages] = useState<{id: string; uri: string; progress: number; name: string}[]>([]);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const imagesRef = useRef(images);
    useEffect(() => {
        imagesRef.current = images;
    }, [images]);

    // Crop modal state
    const [showCropModal, setShowCropModal] = useState(false);
    const [pendingImages, setPendingImages] = useState<{ uri: string; name?: string }[]>([]);
    const [currentCropIndex, setCurrentCropIndex] = useState(0);
    const { confirm } = useDialog();

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
                        if (file.size > 5 * 1024 * 1024) {
                            Alert.alert("File Too Large", `${file.name} exceeds the 5MB limit.`);
                            continue;
                        }
                        const uri = URL.createObjectURL(file);
                        const id = Math.random().toString();
                        setUploadingImages(prev => [...prev, { id, uri, progress: 0, name: file.name }]);

                        const interval = setInterval(() => {
                            setUploadingImages(prev => prev.map(u => 
                                u.id === id && u.progress < 90 ? { ...u, progress: u.progress + 15 } : u
                            ));
                        }, 500);

                        const uploaded = await uploadSingleImage(uri, file.name);
                        
                        clearInterval(interval);
                        setUploadingImages(prev => prev.filter(u => u.id !== id));
                        
                        if (uploaded) {
                            onImagesChange([...imagesRef.current, uploaded]);
                        }
                    }
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [canAddMore, images.length, maxImages]);

    const pickImages = async () => {
        const allowedCount = maxImages - (images.length + uploadingImages.length);
        if (allowedCount <= 0) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: allowedCount,
        });

        if (!result.canceled && result.assets) {
            // Enforce max count since selectionLimit fails on some web browsers
            const newUploads = result.assets.slice(0, allowedCount).map(asset => ({
                id: Math.random().toString(),
                uri: asset.uri,
                progress: 0,
                name: asset.fileName || `image_${Date.now()}.jpg`
            }));

            setUploadingImages(prev => [...prev, ...newUploads]);

            const uploadPromises = newUploads.map(async (upload) => {
                const interval = setInterval(() => {
                    setUploadingImages(prev => prev.map(u => 
                        u.id === upload.id && u.progress < 90 ? { ...u, progress: u.progress + Math.random() * 15 } : u
                    ));
                }, 500);

                const uploaded = await uploadSingleImage(upload.uri, upload.name);
                
                clearInterval(interval);
                // Set progress to 100% instead of deleting right away, so it stays on screen until parent state updates
                setUploadingImages(prev => prev.map(u => 
                    u.id === upload.id ? { ...u, progress: 100 } : u
                ));
                return uploaded;
            });

            const results = await Promise.all(uploadPromises);
            const successfulUploads = results.filter(Boolean) as ImageItem[];
            
            // Delete all from uploadingImages at once
            const uploadIds = newUploads.map(u => u.id);
            setUploadingImages(prev => prev.filter(u => !uploadIds.includes(u.id)));

            if (successfulUploads.length > 0) {
                onImagesChange([...imagesRef.current, ...successfulUploads]);
            }
        }
    };

    const handleCropComplete = async (croppedUri: string) => {
        const current = pendingImages[0];
        setShowCropModal(false);
        
        const id = Math.random().toString();
        setUploadingImages(prev => [...prev, { id, uri: croppedUri, progress: 0, name: current?.name || 'cropped.jpg' }]);

        const interval = setInterval(() => {
            setUploadingImages(prev => prev.map(u => 
                u.id === id && u.progress < 90 ? { ...u, progress: u.progress + 15 } : u
            ));
        }, 500);

        const uploaded = await uploadSingleImage(croppedUri, current?.name);
        
        clearInterval(interval);
        setUploadingImages(prev => prev.filter(u => u.id !== id));

        if (uploaded) {
            const newImages = [...imagesRef.current];
            newImages[currentCropIndex] = uploaded;
            onImagesChange(newImages);
        }

        setPendingImages([]);
        setCurrentCropIndex(0);
    };

    const moveImage = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= images.length) return;
        const newImages = [...images];
        const [moved] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, moved);
        onImagesChange(newImages);
    };

    const moveImageRef = useRef(moveImage);
    useEffect(() => {
        moveImageRef.current = moveImage;
    }, [moveImage]);

    useEffect(() => {
        if (Platform.OS !== 'web' || !containerRef.current) return;
        const container = containerRef.current as any;

        const handleDragStart = (e: any) => {
            const item = e.target.closest('[data-drag-index]');
            if (item) {
                const index = parseInt(item.getAttribute('data-drag-index'), 10);
                setDraggedIndex(index);
                if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index.toString());
                }
            }
        };

        const handleDragOver = (e: any) => {
            const item = e.target.closest('[data-drag-index]');
            if (item) {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            }
        };

        const handleDrop = (e: any) => {
            const item = e.target.closest('[data-drag-index]');
            if (item) {
                e.preventDefault();
                const toIndex = parseInt(item.getAttribute('data-drag-index'), 10);
                setDraggedIndex(prev => {
                    if (prev !== null && prev !== toIndex) {
                        moveImageRef.current(prev, toIndex);
                    }
                    return null;
                });
            }
        };

        const handleDragEnd = () => setDraggedIndex(null);

        container.addEventListener('dragstart', handleDragStart);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('dragend', handleDragEnd);

        return () => {
            container.removeEventListener('dragstart', handleDragStart);
            container.removeEventListener('dragover', handleDragOver);
            container.removeEventListener('drop', handleDrop);
            container.removeEventListener('dragend', handleDragEnd);
        };
    }, []);

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

    const removeImage = async (index: number) => {
        const confirmed = await confirm({
            title: 'Remove Image',
            message: 'Are you sure you want to remove this image?',
            confirmText: 'Remove',
            cancelText: 'Cancel',
            isDestructive: true,
        });

        if (confirmed) {
            const newImages = [...images];
            newImages.splice(index, 1);
            onImagesChange(newImages);
        }
    };

    const clearAll = async () => {
        if (images.length === 0) return;
        const confirmed = await confirm({
            title: 'Clear All Images',
            message: 'Are you sure you want to remove all uploaded images?',
            confirmText: 'Clear All',
            cancelText: 'Cancel',
            isDestructive: true,
        });

        if (confirmed) {
            onImagesChange([]);
        }
    };

    // Empty state - centered
    const isEmpty = images.length === 0 && uploadingImages.length === 0;

    return (
        <View style={styles.container} ref={containerRef}>
            {/* Header info is moved to parent or kept minimal */}
            {isEmpty ? (
                <Pressable
                    style={[styles.emptyDropzone, compact && styles.compactDropzone]}
                    onPress={pickImages}
                >
                    <View style={[styles.iconContainer, compact && styles.compactIconContainer]}>
                        <ImagePlus size={compact ? 24 : 40} color="#B36979" />
                    </View>
                    <Text style={styles.dropzoneTitle}>{compact ? 'Add Image' : 'Upload Product Images'}</Text>
                    {!compact && (
                        <>
                            <Text style={styles.dropzoneSubtitle}>
                                {Platform.OS === 'web' ? 'Click to browse, drag & drop, or paste (Ctrl+V)' : 'Tap to browse your photos'}
                            </Text>
                            <Text style={styles.dropzoneLimit}>Up to {maxImages} images • PNG, JPG (Max 5MB)</Text>
                        </>
                    )}
                </Pressable>
            ) : (
                <View style={styles.populatedContainer}>
                    {!compact && (
                        <View style={styles.header}>
                            <Text style={styles.subtitle}>{images.length}/{maxImages} images uploaded</Text>
                            {images.length > 0 && (
                                <Pressable onPress={clearAll} style={styles.clearAllBtn}>
                                    <Trash2 size={14} color={theme.colors.error || '#D32F2F'} />
                                    <Text style={styles.clearAllText}>Clear All</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    <View style={styles.gridContainer}>
                        {images.map((image, index) => {
                            const isPrimary = index === 0;
                            const isHovered = hoveredIndex === index;
                            const showArrows = Platform.OS === 'web' ? isHovered : true;
                            
                            return (
                                <View
                                    key={index}
                                    style={[
                                        styles.imageWrapper,
                                        isPrimary ? styles.primaryImageWrapper : styles.secondaryImageWrapper,
                                        draggedIndex === index && { opacity: 0.5 }
                                    ]}
                                    ref={el => {
                                        if (el && Platform.OS === 'web') {
                                            const node = el as any;
                                            if (!node.__dragBound) {
                                                node.__dragBound = true;
                                                node.setAttribute('draggable', 'true');
                                                node.setAttribute('data-drag-index', index.toString());
                                            }
                                        }
                                    }}
                                    onPointerEnter={() => setHoveredIndex(index)}
                                    onPointerLeave={() => setHoveredIndex(null)}
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

                                    {showArrows && (
                                        <View style={styles.centerArrowsOverlay} pointerEvents="box-none">
                                            <View style={styles.centerArrowsContainer}>
                                                {index > 0 && (
                                                    <Pressable style={styles.centerArrowButton} onPress={() => moveImage(index, index - 1)}>
                                                        <Text style={styles.centerArrowText}>←</Text>
                                                    </Pressable>
                                                )}
                                                {index < images.length - 1 && (
                                                    <Pressable style={styles.centerArrowButton} onPress={() => moveImage(index, index + 1)}>
                                                        <Text style={styles.centerArrowText}>→</Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.actionsOverlay}>
                                        <Pressable testID="crop-image-btn" style={styles.actionButton} onPress={() => openCropper(index)}>
                                            <Crop size={14} color="#333" />
                                        </Pressable>
                                        <Pressable testID="delete-image-btn" style={[styles.actionButton, styles.deleteButton]} onPress={() => removeImage(index)}>
                                            <Trash2 size={14} color={theme.colors.primary} />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}

                        {/* Uploading Images */}
                        {uploadingImages.map((upload) => (
                            <View key={upload.id} style={[styles.imageWrapper, styles.secondaryImageWrapper]}>
                                <Image
                                    source={{ uri: upload.uri }}
                                    style={[styles.image, { opacity: 0.5 }]}
                                    resizeMode="cover"
                                />
                                <View style={styles.uploadProgressContainer}>
                                    <View style={[styles.uploadProgressBar, { width: `${upload.progress}%` }]} />
                                </View>
                            </View>
                        ))}

                        {canAddMore && uploadingImages.length === 0 && (
                            <Pressable
                                style={[styles.secondaryImageWrapper, styles.uploadingWrapper, { borderColor: '#E8D5D9', backgroundColor: '#FCFAFA' }]}
                                onPress={pickImages}
                            >
                                <ImagePlus size={24} color="#B36979" />
                                <Text style={[styles.uploadingText, { color: '#B36979', marginTop: 4 }]}>Add</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            )}

            {/* Crop Modal */}
            <ImageCropperModal
                visible={showCropModal}
                imageUri={pendingImages[0]?.uri || null}
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
    compactDropzone: {
        minHeight: 120,
        padding: 16,
        borderRadius: 12,
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
    compactIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: 8,
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
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 4,
    },
    clearAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.error || '#D32F2F',
        fontFamily: 'Quicksand',
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
    centerArrowsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    centerArrowsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    centerArrowButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    centerArrowText: {
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
    uploadProgressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    uploadProgressBar: {
        height: '100%',
        backgroundColor: '#B36979',
    },
});
