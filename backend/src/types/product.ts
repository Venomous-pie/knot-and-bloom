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

interface ProductSKU {
    category: string;
    variants: string | undefined;
}

interface ProductDescription {
    name: string;
    category: string;
    variants: string | undefined;
    basePrice: string;
    discountedPrice: string;
}

interface PriceInput {
    basePrice: number;
    discountedPercentage?: number | null | undefined;
}

export type { ProductInput, GetProductsOptions, GetProductsResult, ProductSKU, ProductDescription, PriceInput }