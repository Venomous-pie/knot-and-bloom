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
    images?: string[];
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
    rating?: number;
    reviewCount?: number;
    image: string | null;
    images?: string[];
    description?: string;
    materials?: string;
    tags?: string[];
    isBundle?: boolean;
    bundleQuantity?: number;
    isCodAllowed?: boolean;
    metaTitle?: string | null;
    metaDescription?: string | null;
    videoUrl?: string | null;
    shippingFeeOverride?: number | null;
    isLocalPickupAllowed?: boolean;
    localPickupInstructions?: string | null;
    processingTime?: string | null;
    fulfillmentType?: string;
    isCustomOrderAllowed?: boolean;
    customOrderInstructions?: string | null;
    careInstructions?: string | null;
    minOrderQty?: number | null;
    maxOrderQty?: number | null;
    uploaded: string;
    updated: string;
    variants: ProductVariant[];
    status?: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';
    sellerId?: number | null;
    seller?: {
        name: string;
        slug: string;
        logo?: string | null;
        freeShippingEnabled?: boolean;
        freeShippingThreshold?: number | null;
    } | null;
}

interface GetProductsParams {
    category?: string;
    searchTerm?: string;
    newArrival?: boolean;
    limit?: number;
    offset?: number;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'bestselling';
    minPrice?: number;
    maxPrice?: number;
    categories?: string;
    tags?: string;
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
    processingTime?: string;
}

interface ProductPageProps {
    category: string;
    title: string;
    products: Product[];
    loading: boolean;
    error: string | null;
}

export { CreateProductData, GetProductsParams, GetProductsResponse, Product, ProductPageProps, ProductVariant };

