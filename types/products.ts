interface Product {
    uid: number;
    name: string;
    sku: string;
    category: string;
    variants?: string;
    basePrice: number;
    discountedPrice?: number;
    discountPercentage?: number;
    stock: number;
    image?: string;
    description?: string;
    uploaded: Date;
}

interface GetProductsParams {
    category?: string;
    searchTerm?: string;
    newArrivals?: boolean;
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

export { CreateProductData, GetProductsParams, GetProductsResponse, Product, ProductPageProps };
