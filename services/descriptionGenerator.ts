import { apiClient } from "@/api/api";

export interface ProductDescription {
    name: string;
    category: string;
    variants?: Array<{ name: string }>;
    basePrice?: string;
    discountedPrice?: string;
}

/**
 * Generate a product description using the backend AI service.
 * The API token is securely stored server-side.
 */
export const ProductDescriptionGenerator = async (product: ProductDescription): Promise<string | null> => {
    try {
        const response = await apiClient.post<{ success: boolean; description: string | null }>(
            '/products/generate-description',
            {
                name: product.name,
                category: product.category,
                variants: product.variants,
                basePrice: product.basePrice,
                discountedPrice: product.discountedPrice,
            }
        );

        if (response.data.success) {
            return response.data.description;
        }

        return null;
    } catch (error) {
        console.error("Error generating description:", error);
        return null;
    }
};
