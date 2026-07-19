import { Product } from "@/types/products";

// A global in-memory cache to store individual product details
// This allows product detail pages to load instantly from memory instead of waiting for the network
export const globalProductCache: Record<string, Product> = {};

export const cacheProduct = (product: Product) => {
    if (!product || !product.uid) return;
    globalProductCache[product.uid.toString()] = product;
};

export const getCachedProduct = (id: string): Product | null => {
    return globalProductCache[id] || null;
};

export const cacheProducts = (products: Product[]) => {
    if (!products || !Array.isArray(products)) return;
    products.forEach(cacheProduct);
};
