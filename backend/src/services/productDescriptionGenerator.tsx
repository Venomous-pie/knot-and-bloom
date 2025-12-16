import dotenv from 'dotenv';
dotenv.config();

import { InferenceClient } from "@huggingface/inference";
import type { ProductDescription } from '../types/product.js';

const client = new InferenceClient(process.env.HF_TOKEN);

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

    const descriptionCompletion = await client.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct:cerebras",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });

    return descriptionCompletion.choices[0]?.message?.content ?? null;
};
