import Tesseract from 'tesseract.js';
export const scanWaybill = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ error: "Image URL is required" });
        }
        const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
        // Basic clean up of text
        const cleanedText = text.replace(/\n/g, ' ').trim();
        res.json({
            success: true,
            text: cleanedText,
            originalText: text
        });
    }
    catch (error) {
        console.error("OCR Error:", error);
        res.status(500).json({ error: "Failed to scan image", details: error.message });
    }
};
//# sourceMappingURL=ServicesController.js.map