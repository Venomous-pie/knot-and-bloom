interface ProductVariant {
    uid: number;
    productId: number;
    name: string;
    sku: string;
    stock: number;
    price?: number;
    discountPercentage?: number;
    discountedPrice?: number;
    soldCount: number;
    image?: string;
}

interface Product {
    uid: number;
    name: string;
    sku: string;
    categories: string[];
    basePrice: string;
    discountedPrice?: number | null;
    discountPercentage?: number | null;
    soldCount: number;
    image: string | null;
    description?: string;
    uploaded: string;
    updated: string;
    variants: ProductVariant[];
    sellerId?: number | null;
    seller?: {
        name: string;
        slug: string;
    } | null;
}

interface GetProductsParams {
    category?: string;
    searchTerm?: string;
    newArrival?: boolean;
    limit?: number;
    offset?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'bestselling';
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

