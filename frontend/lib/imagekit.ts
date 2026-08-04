import ImageKit from 'imagekit-javascript';
import { IMAGEKIT_CONFIG } from '../config/imagekit';
import * as ImageManipulator from 'expo-image-manipulator';

const imagekit = new ImageKit({
    urlEndpoint: IMAGEKIT_CONFIG.urlEndpoint,
    publicKey: IMAGEKIT_CONFIG.publicKey,
});

// Max file size before compression (2MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Compression quality
const COMPRESSION_QUALITY = 0.7;

import { apiClient } from '../services/api';

/**
 * Fetch authentication parameters from backend
 */
const getAuthParams = async (): Promise<{ token: string; expire: number; signature: string }> => {
    try {
        const response = await apiClient.get('/imagekit/auth');
        return response.data;
    } catch (error) {
        console.error('Failed to get ImageKit auth params:', error);
        throw new Error('Failed to get ImageKit auth params');
    }
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
            // Crop at max quality (1.0) to avoid unnecessary degradation.
            // The upload function will run `compressImage` later if the file size is still too large.
            { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG }
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
        // Fetch the file as blob to check its size
        const response = await fetch(file.uri);
        const blob = await response.blob();

        // Check file size and compress if needed
        let finalUri = file.uri;
        let finalBlob = blob;

        if (blob.size > MAX_FILE_SIZE) {
            finalUri = await compressImage(file.uri, blob.size);
            const finalResponse = await fetch(finalUri);
            finalBlob = await finalResponse.blob();

            // Verify compression actually got it under the limit
            if (finalBlob.size > MAX_FILE_SIZE) {
                throw new Error(`Image is still too large (${(finalBlob.size / 1024 / 1024).toFixed(2)}MB) after compression. Please select a smaller photo.`);
            }
        }

        // Derive accurate filename extension if missing
        let fileName = file.name;
        if (!fileName) {
            let ext = 'jpg';
            if (finalUri !== file.uri) {
                // We know it's a JPEG if we passed it through compressImage
                ext = 'jpg';
            } else if (file.type) {
                // e.g. "image/png" -> "png"
                const typeParts = file.type.split('/');
                if (typeParts.length === 2) ext = typeParts[1];
            } else {
                // Attempt to extract from original URI
                const uriMatch = file.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
                if (uriMatch) {
                    ext = uriMatch[1];
                }
            }
            fileName = `image_${Date.now()}.${ext}`;
        }

        // Fetch auth params immediately before uploading to minimize the expiry window
        const authParams = await getAuthParams();

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

    try {
        const parsedUrl = new URL(url);
        
        if (url.startsWith(IMAGEKIT_CONFIG.urlEndpoint)) {
            // Safely insert immediately after the known endpoint
            const pathAfterEndpoint = url.slice(IMAGEKIT_CONFIG.urlEndpoint.length);
            const separator = pathAfterEndpoint.startsWith('/') ? '' : '/';
            return `${IMAGEKIT_CONFIG.urlEndpoint}/${transformString}${separator}${pathAfterEndpoint}`;
        } else {
            // Custom CNAME domain or mismatch. Insert at the start of the pathname.
            console.warn(`[getOptimizedUrl] URL ${url} doesn't match urlEndpoint ${IMAGEKIT_CONFIG.urlEndpoint}. Using path-based insertion.`);
            const parts = parsedUrl.pathname.split('/');
            if (parts[0] === '') parts.shift();
            parsedUrl.pathname = `/${transformString}/${parts.join('/')}`;
            return parsedUrl.toString();
        }
    } catch (e) {
        console.warn(`[getOptimizedUrl] Failed to parse URL: ${url}`);
        return url;
    }
};
