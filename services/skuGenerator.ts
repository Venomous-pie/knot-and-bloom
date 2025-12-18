export interface ProductSKU {
    category: string;
    variants?: Array<{ name: string }>;
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

    // If variants exist, use the first variant's name for the code
    if (productData.variants && productData.variants.length > 0 && productData.variants[0].name) {
        variantCode = productData.variants[0].name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        parts.push(variantCode);
    }

    parts.push(uniqueId);

    const generatedSKU = parts.join('-');

    return generatedSKU;
};
