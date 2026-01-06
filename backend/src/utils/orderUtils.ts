import { webcrypto } from 'crypto';

/**
 * Generates a unique, human-readable order reference number.
 * Format: KB-YYYYMMDD-XXXXXXXX
 * Example: KB-20240106-A1B2C3D4
 */
export const generateOrderReference = (): string => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Generate 8 random bytes
    const array = new Uint8Array(4);
    webcrypto.getRandomValues(array);
    const randomHex = Array.from(array)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(); // 8 chars hex

    return `KB-${dateStr}-${randomHex}`;
};
