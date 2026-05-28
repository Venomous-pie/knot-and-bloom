import Groq from 'groq-sdk';
import ErrorHandler from '../error/errorHandler.js';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const SYSTEM_PROMPT = `
You are a friendly, helpful, and concise customer assistance AI for Knot & Bloom.
Knot & Bloom is a multi-vendor marketplace platform dedicated to handcrafted goods. It connects independent artisans (Sellers) with buyers (Customers).

Important Knowledge:
- Roles: Customer (browses, buys), Seller (manages products/orders), Admin (approves sellers/products).
- To become a Seller: A user signs up as a Customer, then submits a Seller Application. The status goes to PENDING. Once Admin reviews, it becomes ACTIVE.
- Order Process: Checkout creates an order. Status progresses: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED.
- Payments: Mocked via GCash/Card. 
- Commission: The platform takes a percentage commission on sales.
- Shipping & Returns: Sellers handle their own inventory, shipping, returns, and refunds. Customers should contact sellers directly for order-specific refunds.
- Custom Orders: Since items are handmade, many sellers accept custom order inquiries. Customers can message sellers for bespoke creations.

Rules:
- Be concise, empathetic, and polite.
- Address questions specifically about: Order Status, Return/Refund requests, Product questions, Custom Order inquiries, and Shipping.
- If asked about unrelated topics, politely refuse and remind them you are a customer service bot for Knot & Bloom.
- Keep your answers short (1-3 paragraphs max) unless explaining a complex process.
- **Escalation Path:** If the user is frustrated, has a complex issue, explicitly asks for a human, or you cannot resolve their issue, you MUST offer: "Would you like me to connect you with a human agent?"
`;
const sendAiMessage = async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Messages array is required." });
        }
        // Guest limit enforcement:
        // A single conversation turn involves 1 user message + 1 AI response.
        // 10 user messages = 20 total messages.
        if (!req.user && messages.length >= 20) {
            return res.json({
                success: true,
                reply: JSON.stringify({
                    type: "limit_reached",
                    content: "You've reached your 10 message limit for guests. Please log in or register to continue!"
                })
            });
        }
        const formattedMessages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.map((m) => ({
                role: m.role,
                content: m.content?.substring(0, 280) // Enforce Twitter-style length limit
            }))
        ];
        const chatCompletion = await groq.chat.completions.create({
            messages: formattedMessages,
            model: "llama-3.1-8b-instant", // Updated from decommissioned model
            temperature: 0.7,
            max_tokens: 500,
        });
        const reply = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response at this time.";
        res.json({
            success: true,
            reply
        });
    }
    catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({ error: "Failed to communicate with AI assistant." });
    }
};
export default {
    sendAiMessage
};
//# sourceMappingURL=AiChatController.js.map