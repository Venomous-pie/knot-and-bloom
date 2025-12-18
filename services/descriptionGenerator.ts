import { InferenceClient } from "@huggingface/inference";

export interface ProductDescription {
    name: string;
    category: string;
    variants?: string;
    basePrice: string;
    discountedPrice?: string;
}

// NOTE: In a real production app, you should not expose API tokens in the frontend code.
// Ideally, use a proxy server or Edge Function.
// For this task, we assume the token is available via EXPO_PUBLIC_HF_TOKEN or similar env variable.
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN || "hf_..."; // Replace or ensure env var is set

const client = new InferenceClient(HF_TOKEN);

export const ProductDescriptionGenerator = async (product: ProductDescription) => {
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

    const userPrompt = `
        Write a product description using the details below.

        Name: ${product.name}
        Category: ${product.category}
        Variants: ${product.variants ?? "None"}
        Base Price: ${product.basePrice}
        Discounted Price: ${product.discountedPrice ?? "None"}

        Guidelines:
        - Start with an engaging, cheerful opening sentence
        - Highlight what makes the product special or handmade
        - Mention the category naturally (do not show category codes)
        - If variants exist, mention that customers can choose their favorite
        `;

    try {
        const descriptionCompletion = await client.chatCompletion({
            model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        return descriptionCompletion.choices[0]?.message?.content ?? null;
    } catch (error) {
        console.error("Error generating description:", error);
        return null; // Or throw error to handle in UI
    }
};
