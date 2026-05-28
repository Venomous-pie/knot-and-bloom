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
            model: "meta-llama/Llama-3.3-70B-Instruct",
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

function buildSKU(category: string, variants?: Array<{ name: string }>, name?: string): string {
    // Get category code or default to first 3 letters
    const categoryCode = CategoryCodes[category] || category.substring(0, 3).toUpperCase();

    const parts = [categoryCode];
    
    // Add product name prefix (first 3 consonants or letters)
    if (name) {
        const cleanName = name.replace(/[^A-Za-z]/g, '').toUpperCase();
        // Try to get consonants first
        const consonants = cleanName.replace(/[AEIOU]/g, '');
        const prefix = (consonants.length >= 3 ? consonants : cleanName).substring(0, 3);
        if (prefix) parts.push(prefix);
    }

    // Add variant code if variants exist
    const firstVariant = variants?.[0];
    if (firstVariant?.name && firstVariant.name.toLowerCase() !== 'default') {
        const variantCode = firstVariant.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
        parts.push(variantCode);
    }

    // Add 3 random digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    parts.push(random);

    return parts.join('-');
}

export async function generateProductSKU(input: GenerateSKUInput): Promise<string> {
    let sku: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        sku = buildSKU(input.category, input.variants, (input as any).name);

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

export async function generateOptionValues(optionName: string): Promise<string[]> {
    const systemPrompt = `
        You are a helpful e-commerce assistant.
        The user will provide a product option name (e.g., "Scent", "Bundle Size", "Flavor").
        Your task is to return exactly 6 typical values for that option name.
        Return ONLY a comma-separated list of values. Do not include any explanations, bullet points, quotes, or conversational text.
        Make the values concise and common for e-commerce.
    `;

    const userPrompt = `Option name: ${optionName}`;

    try {
        const inferenceClient = getClient();
        const completion = await inferenceClient.chatCompletion({
            model: "meta-llama/Llama-3.3-70B-Instruct",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 50,
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) return [];

        // Split by comma and clean up
        return content
            .split(',')
            .map(v => v.trim().replace(/^['"]|['"]$/g, '')) // Remove quotes
            .filter(v => v.length > 0 && v.length < 25) // Basic sanity check
            .slice(0, 6);
    } catch (error) {
        console.error("Error generating option values:", error);
        return []; // Fail silently and return no suggestions
    }
}
