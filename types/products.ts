interface ProductVariant {
    uid: number;
    productId: number;
    name: string;
    sku: string;
    stock: number;
    price?: number;
}

export interface Product {
    uid: number;
    name: string;
    sku: string;
    categories: string[]; // Array of categories
    basePrice: string;
    discountedPrice?: string;
    discountPercentage?: number;
    image?: string;
    description?: string;
    uploaded: string;
    updated: string;
    variants: ProductVariant[];
}  // Array of variants instead of string

interface GetProductsParams {
    category?: string;
    searchTerm?: string;
    newArrival?: boolean;
    limit?: number;
    offset?: number;
}

interface GetProductsResponse {
    products: Product[];
    total: number;
    pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
        currentPage: number;
        totalPages: number;
    };
}

interface CreateProductData {
    name: string;
    sku?: string;
    category: string;
    variants?: string;
    basePrice: number;
    discountPercentage?: number;
    stock?: number;
    image?: string;
    description?: string;
}

interface ProductPageProps {
    category: string;
    title: string;
    products: Product[];
    loading: boolean;
    error: string | null;
}

export { CreateProductData, GetProductsParams, GetProductsResponse, Product, ProductPageProps, ProductVariant };

