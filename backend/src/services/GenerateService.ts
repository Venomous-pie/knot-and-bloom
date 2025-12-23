import { InferenceClient } from "@huggingface/inference";
import prisma from "../utils/prismaUtils.js";
import CategoryCodes from '../constant/categories.js';
import type { GenerateSKUInput, GenerateVariantSKUInput, ProductDescriptionInput } from '../types/productTypes.js';

// Use server-side environment variable - NOT exposed to clients
const HF_TOKEN = process.env.HF_TOKEN;

let client: InferenceClient | null = null;

function getClient(): InferenceClient {
    if (!client) {
        if (!HF_TOKEN) {
            throw new Error("HF_TOKEN environment variable is not set");
        }
        client = new InferenceClient(HF_TOKEN);
    }
    return client;
}

export async function generateProductDescription(product: ProductDescriptionInput): Promise<string | null> {
    const systemPrompt = `
        You are a creative product copywriter for a cute handmade crafts shop.

        Your writing style is:
        - Cute, lively, and warm
        - Friendly and cozy
        - Short but expressive
        - Suitable for an online product listing

        Rules:
        - Use emojis sparingly (1–3 max)
        - Do NOT mention price numbers
        - Do NOT include headings or bullet points
        - Keep descriptions between 60–120 words
        - Output ONLY the description text
        `;

    // Format variants for the prompt
    const variantsList = product.variants && product.variants.length > 0
        ? product.variants.map(v => v.name).join(', ')
        : 'None';

    const userPrompt = `
        Write a product description using the details below.

        Name: ${product.name}
        Category: ${product.category}
        Variants: ${variantsList}
        ${product.basePrice ? `Base Price: ${product.basePrice}` : ""}
        ${product.discountedPrice ? `Discounted Price: ${product.discountedPrice}` : ""}

        Guidelines:
        - Start with an engaging, cheerful opening sentence
        - Highlight what makes the product special or handmade
        - Mention the category naturally (do not show category codes)
        - If variants exist, mention that customers can choose their favorite
    `;

    try {
        const inferenceClient = getClient();
        const descriptionCompletion = await inferenceClient.chatCompletion({
            model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        return descriptionCompletion.choices[0]?.message?.content ?? null;
    } catch (error) {
        console.error("Error generating description:", error);
        throw error;
    }
}

function buildSKU(category: string, variants?: Array<{ name: string }>): string {
    // Get category code or default to first 3 letters
    const categoryCode = CategoryCodes[category] || category.substring(0, 3).toUpperCase();

    // Generate unique identifier (timestamp + random)
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const uniqueId = `${timestamp}${random}`;

    const parts = [categoryCode];

    // If variants exist, use the first variant's name for the code
    const firstVariant = variants?.[0];
    if (firstVariant?.name) {
        const variantCode = firstVariant.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        parts.push(variantCode);
    }

    parts.push(uniqueId);

    return parts.join('-');
}

export async function generateProductSKU(input: GenerateSKUInput): Promise<string> {
    let sku: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        sku = buildSKU(input.category, input.variants);

        // Check if SKU already exists
        const exists = await prisma.product.findUnique({
            where: { sku },
            select: { uid: true }
        });

        if (!exists) {
            return sku;
        }

        attempts++;
        console.log(`SKU collision detected: ${sku}, attempt ${attempts}/${maxAttempts}`);
    } while (attempts < maxAttempts);

    // If we've exhausted attempts, append extra random chars
    const extraRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${sku}-${extraRandom}`;
}

export async function generateVariantSKU(input: GenerateVariantSKUInput): Promise<string> {
    if (!input.baseSKU || !input.variantName) {
        return input.baseSKU;
    }

    const cleanVariant = input.variantName.trim().substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const variantSKU = `${input.baseSKU}-${cleanVariant}${random}`;

    // Check for collision with existing variant SKUs
    const exists = await prisma.productVariant.findFirst({
        where: { sku: variantSKU },
        select: { uid: true }
    });

    if (exists) {
        // Add extra randomness if collision
        const extraRandom = Math.random().toString(36).substring(2, 4).toUpperCase();
        return `${variantSKU}${extraRandom}`;
    }

    return variantSKU;
}
