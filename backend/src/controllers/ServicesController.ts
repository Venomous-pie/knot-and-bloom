import type { Request, Response } from 'express';
import Tesseract from 'tesseract.js';

export const scanWaybill = async (req: Request, res: Response) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: "Image URL is required" });
        }

        const { data: { text } } = await Tesseract.recognize(
            imageUrl,
            'eng',
            // { logger: m => console.log(m) } // Optional logger
        );

        // Basic clean up of text
        const cleanedText = text.replace(/\n/g, ' ').trim();

        res.json({
            success: true,
            text: cleanedText,
            originalText: text
        });

    } catch (error: any) {
        console.error("OCR Error:", error);
        res.status(500).json({ error: "Failed to scan image", details: error.message });
    }
};
