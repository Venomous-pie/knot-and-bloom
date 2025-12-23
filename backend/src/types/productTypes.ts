import type { Product } from "../../generated/prisma/index.js";

interface ProductInput {
    name: string;
    sku: string | undefined;
    category: string;
    variants?: string;
    basePrice: number;
    discountedPrice?: number;
    discountPercentage?: number;
    stock: number;
    image?: string;
    description?: string;
}

interface GetProductsOptions {
    category?: string;
    limit?: number;
    newArrival: boolean;
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


interface GenerateVariantSKUInput {
    baseSKU: string;
    variantName: string;
}

interface GenerateSKUInput {
    category: string;
    variants?: Array<{ name: string }>;
}

interface ProductDescriptionInput {
    name: string;
    category: string;
    variants?: Array<{ name: string }>;
    basePrice?: string;
    discountedPrice?: string;
}

export type { GetProductsOptions, GetProductsResult, ProductInput, GenerateSKUInput, GenerateVariantSKUInput, ProductDescriptionInput };
