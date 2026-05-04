/**
 * Product Optimization Score Engine
 * 
 * Calculates a weighted 0–100 score across 5 categories,
 * returning both the total and a per-category breakdown with actionable tips.
 */

export interface ScoreCriteria {
    label: string;
    passed: boolean;
    points: number;
    maxPoints: number;
    tip: string;
}

export interface ScoreCategory {
    name: string;
    score: number;
    maxScore: number;
    criteria: ScoreCriteria[];
}

export interface OptimizationResult {
    totalScore: number;
    categories: ScoreCategory[];
}

interface ProductInput {
    image?: string | null;
    name?: string;
    description?: string | null;
    tags?: string[];
    materials?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    basePrice?: number | string;
    discountPercentage?: number | string | null;
    variants?: Array<{
        stock?: number | string;
        images?: string[];
    }>;
}

export function calculateOptimizationScore(product: ProductInput): OptimizationResult {
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    // ── Images (25 pts) ──────────────────────────────────────────────
    const hasMainImage = !!product.image;
    const hasVariantImages = hasVariants && variants.some(v => v.images && v.images.length > 0);

    const imagesCategory: ScoreCategory = {
        name: 'Images',
        maxScore: 25,
        score: 0,
        criteria: [
            {
                label: 'Main product image',
                passed: hasMainImage,
                points: hasMainImage ? 15 : 0,
                maxPoints: 15,
                tip: 'Upload a clear, high-quality hero image for your product.',
            },
            {
                label: 'Variant images',
                passed: hasVariantImages,
                points: hasVariantImages ? 10 : 0,
                maxPoints: 10,
                tip: 'Add images to your variants so customers can see each option.',
            },
        ],
    };
    imagesCategory.score = imagesCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Title & SEO (25 pts) ─────────────────────────────────────────
    const nameLength = product.name?.length || 0;
    const metaTitleLength = product.metaTitle?.trim().length || 0;
    const hasLongName = nameLength >= 30 || metaTitleLength >= 30;
    const hasTags = !!product.tags && product.tags.length > 0;
    const hasMetaTitle = metaTitleLength > 0;

    const seoCategory: ScoreCategory = {
        name: 'Title & SEO',
        maxScore: 25,
        score: 0,
        criteria: [
            {
                label: 'Descriptive title (30+ chars)',
                passed: hasLongName,
                points: hasLongName ? 10 : 0,
                maxPoints: 10,
                tip: `Use a descriptive name with key details (e.g. "Handmade Crochet Sunflower Tote Bag — Cotton"). Currently ${nameLength} chars.`,
            },
            {
                label: 'Search tags added',
                passed: hasTags,
                points: hasTags ? 8 : 0,
                maxPoints: 8,
                tip: 'Add tags like "handmade", "crochet", "gift" to boost discoverability.',
            },
            {
                label: 'SEO meta title',
                passed: hasMetaTitle,
                points: hasMetaTitle ? 7 : 0,
                maxPoints: 7,
                tip: 'Set a custom meta title (≤70 chars) for search engine results.',
            },
        ],
    };
    seoCategory.score = seoCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Description (20 pts) ─────────────────────────────────────────
    const descLength = product.description?.length || 0;
    const hasGoodDesc = descLength >= 100;
    const hasGreatDesc = descLength >= 200;
    const hasMaterials = !!product.materials && product.materials.trim().length > 0;

    const descCategory: ScoreCategory = {
        name: 'Description',
        maxScore: 20,
        score: 0,
        criteria: [
            {
                label: 'Description (100+ chars)',
                passed: hasGoodDesc,
                points: hasGoodDesc ? 10 : 0,
                maxPoints: 10,
                tip: `Write at least 100 characters describing your product. Currently ${descLength} chars.`,
            },
            {
                label: 'Rich description (200+ chars)',
                passed: hasGreatDesc,
                points: hasGreatDesc ? 5 : 0,
                maxPoints: 5,
                tip: 'A detailed description (200+ chars) builds buyer confidence and improves SEO.',
            },
            {
                label: 'Materials specified',
                passed: hasMaterials,
                points: hasMaterials ? 5 : 0,
                maxPoints: 5,
                tip: 'List the materials used (e.g. "100% Cotton Yarn") so customers know what they\'re buying.',
            },
        ],
    };
    descCategory.score = descCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Inventory (15 pts) ───────────────────────────────────────────
    const hasStock = hasVariants && variants.some(v => Number(v.stock || 0) > 0);
    const hasLowStock = hasVariants && variants.some(v => {
        const s = Number(v.stock || 0);
        return s > 0 && s <= 5;
    });

    const inventoryCategory: ScoreCategory = {
        name: 'Inventory',
        maxScore: 15,
        score: 0,
        criteria: [
            {
                label: 'In stock',
                passed: hasStock,
                points: hasStock ? 8 : 0,
                maxPoints: 8,
                tip: 'Ensure at least one variant is in stock.',
            },
            {
                label: 'Healthy stock levels',
                passed: hasStock && !hasLowStock,
                points: (hasStock && !hasLowStock) ? 7 : 0,
                maxPoints: 7,
                tip: 'Restock variants with 5 or fewer items to avoid missed sales.',
            },
        ],
    };
    inventoryCategory.score = inventoryCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Pricing (15 pts) ─────────────────────────────────────────────
    const price = Number(product.basePrice || 0);
    const hasPrice = price > 0;
    const discount = Number(product.discountPercentage || 0);
    const hasDiscount = discount > 0;

    const pricingCategory: ScoreCategory = {
        name: 'Pricing',
        maxScore: 15,
        score: 0,
        criteria: [
            {
                label: 'Active promotion/discount',
                passed: hasDiscount,
                points: hasDiscount ? 8 : 0,
                maxPoints: 8,
                tip: 'Products with discounts get 2× more clicks. Consider a launch sale.',
            },
            {
                label: 'Price set',
                passed: hasPrice,
                points: hasPrice ? 7 : 0,
                maxPoints: 7,
                tip: 'Set a competitive base price for your product.',
            },
        ],
    };
    pricingCategory.score = pricingCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Total ────────────────────────────────────────────────────────
    const categories = [imagesCategory, seoCategory, descCategory, inventoryCategory, pricingCategory];
    const totalScore = categories.reduce((s, c) => s + c.score, 0);

    return { totalScore, categories };
}
