import { z } from 'zod';
export declare const productSchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    categories: z.ZodArray<z.ZodString>;
    variants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uid: z.ZodOptional<z.ZodNumber>;
        name: z.ZodString;
        sku: z.ZodOptional<z.ZodString>;
        stock: z.ZodCoercedNumber<unknown>;
        price: z.ZodOptional<z.ZodAny>;
        discountPercentage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        images: z.ZodOptional<z.ZodArray<z.ZodString>>;
        isEnabled: z.ZodOptional<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, z.core.$strip>>>;
    basePrice: z.ZodNumber;
    discountPercentage: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodOptional<z.ZodNumber>;
    image: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    images: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    materials: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metaTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metaDescription: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sellerId: z.ZodOptional<z.ZodNumber>;
    version: z.ZodOptional<z.ZodNumber>;
    videoUrl: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>>;
    shippingFeeOverride: z.ZodOptional<z.ZodAny>;
    isLocalPickupAllowed: z.ZodOptional<z.ZodBoolean>;
    localPickupInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    processingTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fulfillmentType: z.ZodOptional<z.ZodEnum<{
        READY_TO_SHIP: "READY_TO_SHIP";
        MADE_TO_ORDER: "MADE_TO_ORDER";
    }>>;
    isCustomOrderAllowed: z.ZodOptional<z.ZodBoolean>;
    customOrderInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    careInstructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    minOrderQty: z.ZodOptional<z.ZodAny>;
    maxOrderQty: z.ZodOptional<z.ZodAny>;
    productOptions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        uid: z.ZodOptional<z.ZodNumber>;
        name: z.ZodString;
        position: z.ZodOptional<z.ZodNumber>;
        values: z.ZodArray<z.ZodObject<{
            uid: z.ZodOptional<z.ZodNumber>;
            value: z.ZodString;
            imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const getProductsQuerySchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    searchTerm: z.ZodOptional<z.ZodString>;
    newArrival: z.ZodDefault<z.ZodOptional<z.ZodCoercedBoolean<unknown>>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    offset: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    sort: z.ZodOptional<z.ZodEnum<{
        newest: "newest";
        price_asc: "price_asc";
        price_desc: "price_desc";
        bestselling: "bestselling";
    }>>;
}, z.core.$strip>;
export type ProductInput = z.infer<typeof productSchema>;
export type GetProductOptions = z.infer<typeof getProductsQuerySchema>;
//# sourceMappingURL=productValidator.d.ts.map