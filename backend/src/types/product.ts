import type { Product } from "../../generated/prisma/index.js";

interface ProductInput {
    name: string,
    sku: string,
    category: string,
    variants?: string,
    basePrice: string,
    discountedPrice?: string,
    stock: number,
    image?: string,
    description?: string,
}

interface GetProductsOptions {
    category?: string;
    limit?: number;
    offset?: number;
    searchTerm?: string;
}

interface GetProductsResult {
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

export type { ProductInput, GetProductsOptions, GetProductsResult }