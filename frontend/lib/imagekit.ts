import ImageKit from 'imagekit-javascript';
import { IMAGEKIT_CONFIG } from '../config/imagekit';
import * as ImageManipulator from 'expo-image-manipulator';

// Initialize ImageKit SDK
console.log('Initializing ImageKit with:', {
    urlEndpoint: IMAGEKIT_CONFIG.urlEndpoint,
    publicKey: IMAGEKIT_CONFIG.publicKey ? 'Present' : 'Missing',
    authEndpoint: IMAGEKIT_CONFIG.authenticationEndpoint
});

const imagekit = new ImageKit({
    urlEndpoint: IMAGEKIT_CONFIG.urlEndpoint,
    publicKey: IMAGEKIT_CONFIG.publicKey,
});

// Max file size before compression (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Compression quality
const COMPRESSION_QUALITY = 0.7;

/**
 * Fetch authentication parameters from backend
 */
const getAuthParams = async (): Promise<{ token: string; expire: number; signature: string }> => {
    const response = await fetch(IMAGEKIT_CONFIG.authenticationEndpoint);
    if (!response.ok) {
        throw new Error('Failed to get ImageKit auth params');
    }
    return response.json();
};

/**
 * Compress image if it exceeds max size
 */
export const compressImage = async (uri: string, fileSize?: number): Promise<string> => {
    // If file size is unknown or under limit, return as is
    if (!fileSize || fileSize <= MAX_FILE_SIZE) {
        return uri;
    }

    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [], // No transforms, just compress
            { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (error) {
        console.error('Image compression failed:', error);
        return uri; // Return original if compression fails
    }
};

/**
 * Crop image with given dimensions
 */
export const cropImage = async (
    uri: string,
    cropData: { originX: number; originY: number; width: number; height: number }
): Promise<string> => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ crop: cropData }],
            { compress: COMPRESSION_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (error) {
        console.error('Image crop failed:', error);
        throw error;
    }
};

/**
 * Upload file to ImageKit
 */
export const uploadToImageKit = async (
    file: { uri: string; name?: string; type?: string },
    options?: { folder?: string; tags?: string[] }
): Promise<{ url: string; fileId: string; name: string }> => {
    try {
        const authParams = await getAuthParams();

        // Fetch the file as blob for upload
        const response = await fetch(file.uri);
        const blob = await response.blob();

        // Check file size and compress if needed
        let finalUri = file.uri;
        if (blob.size > MAX_FILE_SIZE) {
            finalUri = await compressImage(file.uri, blob.size);
        }

        // Re-fetch if compressed
        const finalResponse = finalUri !== file.uri ? await fetch(finalUri) : response;
        const finalBlob = finalUri !== file.uri ? await finalResponse.blob() : blob;

        const fileName = file.name || `image_${Date.now()}.jpg`;

        return new Promise((resolve, reject) => {
            imagekit.upload(
                {
                    file: finalBlob,
                    fileName,
                    folder: options?.folder || '/products',
                    tags: options?.tags || ['product'],
                    ...authParams,
                },
                (err, result) => {
                    if (err) {
                        console.error('ImageKit upload error:', err);
                        reject(err);
                    } else if (result) {
                        resolve({
                            url: result.url,
                            fileId: result.fileId,
                            name: result.name,
                        });
                    } else {
                        reject(new Error('Upload failed - no result'));
                    }
                }
            );
        });
    } catch (error) {
        console.error('Upload to ImageKit failed:', error);
        throw error;
    }
};

/**
 * Get optimized image URL with transformations
 */
export const getOptimizedUrl = (
    url: string,
    options?: { width?: number; height?: number; quality?: number }
): string => {
    if (!url || !IMAGEKIT_CONFIG.urlEndpoint) return url;

    // Build transformation string
    const transforms: string[] = [];
    if (options?.width) transforms.push(`w-${options.width}`);
    if (options?.height) transforms.push(`h-${options.height}`);
    if (options?.quality) transforms.push(`q-${options.quality}`);

    if (transforms.length === 0) return url;

    // Insert transformation into URL path
    const transformString = `tr:${transforms.join(',')}`;
    return url.replace(IMAGEKIT_CONFIG.urlEndpoint, `${IMAGEKIT_CONFIG.urlEndpoint}/${transformString}`);
};
