
import { SellerStatus } from "../types/authTypes.js";
import prisma from "./prismaUtils.js";

// Helper to ensure Admin has a Seller Profile (auto-creation for shared inventory access)
export async function ensureAdminSellerProfile(userId: number, email: string): Promise<number> {
    const existingSeller = await prisma.seller.findUnique({ where: { customerId: userId } });
    if (existingSeller) return existingSeller.uid;

    // Create Official Seller Profile
    // Check if slug exists first
    const defaultSlug = "knot-and-bloom-official";
    let slug = defaultSlug;
    const existingSlug = await prisma.seller.findUnique({ where: { slug } });
    if (existingSlug && existingSlug.customerId !== userId) {
        // Just in case another admin claimed it? or retry logic
        slug = `${defaultSlug}-${Date.now()}`;
    }

    const seller = await prisma.seller.create({
        data: {
            customerId: userId,
            name: "Knot & Bloom", // Default official name
            slug: slug,
            email: email,
            description: "Official Knot & Bloom Store",
            status: SellerStatus.ACTIVE, // Auto-active
            termsAccepted: true,
            termsAcceptedAt: new Date(),
        }
    });

    return seller.uid;
}
