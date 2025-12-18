export interface ProductSKU {
    category: string;
    variants?: string;
}

const CategoryCodes: Record<string, string> = {
    "popular": "POP",
    "new-arrival": "NEW",
    "crochet": "CRO",
    "fuzzy-wire-art": "FWA",
    "accessories": "ACC",
    "tops": "TOP",
    "hair-tie": "HRT",
    "mini-stuffed-toy": "MST",
    "fuzzy-wire-bouquet": "FWB",
    "crochet-flower-bouquet": "CFB",
    "crochet-key-chains": "CKC",
};

export const SKUGenerator = async (productData: ProductSKU): Promise<string> => {
    // Get category code or default to first 3 letters
    const categoryCode = CategoryCodes[productData.category] || productData.category.substring(0, 3).toUpperCase();

    // Generate unique identifier (timestamp + random)
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uniqueId = `${timestamp}${random}`;

    let variantCode = "";

    const parts = [categoryCode]

    if (productData.variants) {
        variantCode = `${productData.variants.substring(0, 3).toUpperCase()}`;
        parts.push(variantCode);
    }

    parts.push(uniqueId);

    const generatedSKU = parts.join('-');

    return generatedSKU;
};
