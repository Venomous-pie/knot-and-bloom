
import { SellerStatus } from "../types/authTypes.js";
import prisma from "./prismaUtils.js";

// Helper to ensure Admin has a Seller Profile (auto-creation for shared inventory access)
export async function ensureAdminSellerProfile(userId: number, email: string): Promise<number> {
    const defaultSlug = "knot-and-bloom-official";
    
    // Always return the official store if it already exists, regardless of who owns it
    const existingOfficialStore = await prisma.seller.findUnique({ where: { slug: defaultSlug } });
    if (existingOfficialStore) return existingOfficialStore.uid;

    const user = await prisma.user.findUnique({ where: { uid: userId } });
    if (!user) {
        throw new Error("Admin user not found. Your session may be stale. Please log out and log in again.");
    }

    // Create Official Seller Profile, assigning the first admin as the technical owner
    const seller = await prisma.seller.create({
        data: {
            userId: userId,
            name: "Knot & Bloom", // Default official name
            slug: defaultSlug,
            email: email,
            description: "Official Knot & Bloom Store",
            status: SellerStatus.ACTIVE, // Auto-active
        }
    });

    return seller.uid;
}
