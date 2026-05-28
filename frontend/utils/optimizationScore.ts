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
    videoUrl?: string | null;
    name?: string;
    description?: string | null;
    tags?: string[];
    materials?: string | null;
    careInstructions?: string | null;
    processingTime?: string | null;
    basePrice?: number | string;
    discountPercentage?: number | string | null;
    variants?: Array<{
        stock?: number | string;
        images?: string[];
        isEnabled?: boolean;
    }>;
}

export function calculateOptimizationScore(product: ProductInput): OptimizationResult {
    const variants = product.variants || [];
    const activeVariants = variants.filter(v => v.isEnabled !== false);
    const hasVariants = activeVariants.length > 0;

    // ── Media (25 pts) ──────────────────────────────────────────────
    const hasMainImage = !!product.image;
    const hasVariantImages = hasVariants && activeVariants.some(v => v.images && v.images.length > 0);
    const hasVideo = !!(product.videoUrl && product.videoUrl.trim().length > 0);

    const mediaCategory: ScoreCategory = {
        name: 'Media',
        maxScore: 25,
        score: 0,
        criteria: [
            {
                label: 'Main product image',
                passed: hasMainImage,
                points: hasMainImage ? 10 : 0,
                maxPoints: 10,
                tip: 'Upload a clear, high-quality hero image for your product.',
            },
            {
                label: 'Variant images',
                passed: hasVariantImages,
                points: hasVariantImages ? 5 : 0,
                maxPoints: 5,
                tip: 'Add images to your variants so customers can see each option.',
            },
            {
                label: 'Product video',
                passed: hasVideo,
                points: hasVideo ? 10 : 0,
                maxPoints: 10,
                tip: 'Add a video link (TikTok, Instagram, etc.) to showcase your product in action.',
            },
        ],
    };
    mediaCategory.score = mediaCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Title & SEO (25 pts) ─────────────────────────────────────────
    const nameLength = product.name?.length || 0;
    const hasLongName = nameLength >= 30;
    const hasTags = !!product.tags && product.tags.length > 0;
    const hasMultipleTags = !!product.tags && product.tags.length >= 3;

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
                tip: `Use a descriptive name with key details (e.g. "Handmade Crochet Sunflower Tote Bag"). Currently ${nameLength} chars.`,
            },
            {
                label: 'Search tags added',
                passed: hasTags,
                points: hasTags ? 8 : 0,
                maxPoints: 8,
                tip: 'Add tags like "handmade", "crochet", "gift" to boost discoverability.',
            },
            {
                label: '3+ search tags',
                passed: hasMultipleTags,
                points: hasMultipleTags ? 7 : 0,
                maxPoints: 7,
                tip: 'Adding at least 3 tags significantly improves search visibility.',
            },
        ],
    };
    seoCategory.score = seoCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Description & Details (20 pts) ───────────────────────────────
    const descLength = product.description?.length || 0;
    const hasGoodDesc = descLength >= 100;
    const hasMaterials = !!product.materials && product.materials.trim().length > 0;
    const hasCareInstructions = !!(product.careInstructions && product.careInstructions.trim().length > 0);

    const descCategory: ScoreCategory = {
        name: 'Description & Details',
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
                label: 'Materials specified',
                passed: hasMaterials,
                points: hasMaterials ? 5 : 0,
                maxPoints: 5,
                tip: 'List the materials used (e.g. "100% Cotton Yarn") so customers know what they\'re buying.',
            },
            {
                label: 'Care instructions added',
                passed: hasCareInstructions,
                points: hasCareInstructions ? 5 : 0,
                maxPoints: 5,
                tip: 'Add care instructions to set buyer expectations and reduce returns.',
            },
        ],
    };
    descCategory.score = descCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Fulfillment & Inventory (20 pts) ─────────────────────────────
    const hasProcessingTime = !!(product.processingTime && product.processingTime.trim().length > 0);
    const hasStock = hasVariants && activeVariants.some(v => Number(v.stock || 0) > 0);
    const hasLowStock = hasVariants && activeVariants.some(v => {
        const s = Number(v.stock || 0);
        return s > 0 && s <= 5;
    });

    const inventoryCategory: ScoreCategory = {
        name: 'Fulfillment & Inventory',
        maxScore: 20,
        score: 0,
        criteria: [
            {
                label: 'Processing time specified',
                passed: hasProcessingTime,
                points: hasProcessingTime ? 5 : 0,
                maxPoints: 5,
                tip: 'Provide a clear processing time so buyers know when to expect their order.',
            },
            {
                label: 'In stock',
                passed: hasStock,
                points: hasStock ? 10 : 0,
                maxPoints: 10,
                tip: 'Ensure at least one active variant is in stock.',
            },
            {
                label: 'Healthy stock levels',
                passed: hasStock && !hasLowStock,
                points: (hasStock && !hasLowStock) ? 5 : 0,
                maxPoints: 5,
                tip: 'Restock variants with 5 or fewer items to avoid missed sales.',
            },
        ],
    };
    inventoryCategory.score = inventoryCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Pricing (10 pts) ─────────────────────────────────────────────
    const price = Number(product.basePrice || 0);
    const hasPrice = price > 0;
    const discount = Number(product.discountPercentage || 0);
    const hasDiscount = discount > 0;

    const pricingCategory: ScoreCategory = {
        name: 'Pricing',
        maxScore: 10,
        score: 0,
        criteria: [
            {
                label: 'Price set',
                passed: hasPrice,
                points: hasPrice ? 5 : 0,
                maxPoints: 5,
                tip: 'Set a competitive base price for your product.',
            },
            {
                label: 'Active promotion/discount',
                passed: hasDiscount,
                points: hasDiscount ? 5 : 0,
                maxPoints: 5,
                tip: 'Products with discounts get 2× more clicks. Consider a launch sale.',
            },
        ],
    };
    pricingCategory.score = pricingCategory.criteria.reduce((s, c) => s + c.points, 0);

    // ── Total ────────────────────────────────────────────────────────
    const categories = [mediaCategory, seoCategory, descCategory, inventoryCategory, pricingCategory];
    const totalScore = categories.reduce((s, c) => s + c.score, 0);

    return { totalScore, categories };
}
