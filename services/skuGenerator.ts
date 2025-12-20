import { apiClient } from "@/api/api";

export interface ProductSKU {
    category: string;
    variants?: Array<{ name: string }>;
}

/**
 * Generate a unique product SKU using the backend service.
 * The backend validates uniqueness against the database.
 */
export const SKUGenerator = async (productData: ProductSKU): Promise<string> => {
    try {
        const response = await apiClient.post<{ success: boolean; sku: string }>(
            '/products/generate-sku',
            {
                category: productData.category,
                variants: productData.variants,
            }
        );

        if (response.data.success) {
            return response.data.sku;
        }

        throw new Error('Failed to generate SKU');
    } catch (error) {
        console.error("Error generating SKU:", error);
        throw error;
    }
};

/**
 * Generate a variant SKU based on the product's base SKU.
 * The backend validates uniqueness against existing variants.
 */
export const generateVariantSKU = async (baseSKU: string, variantName: string): Promise<string> => {
    if (!baseSKU || !variantName) return baseSKU;

    try {
        const response = await apiClient.post<{ success: boolean; sku: string }>(
            '/products/generate-variant-sku',
            {
                baseSKU,
                variantName,
            }
        );

        if (response.data.success) {
            return response.data.sku;
        }

        throw new Error('Failed to generate variant SKU');
    } catch (error) {
        console.error("Error generating variant SKU:", error);
        // Fallback to client-side generation if API fails
        const cleanVariant = variantName.trim().substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${baseSKU}-${cleanVariant}${random}`;
    }
};
