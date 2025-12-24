// ImageKit Configuration
export const IMAGEKIT_CONFIG = {
    urlEndpoint: process.env.EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
    publicKey: process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
    authenticationEndpoint: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3030'}/api/imagekit/auth`,
};
