import { SellerStatus } from "../types/authTypes.js";
import prisma from "./prismaUtils.js";
// Helper to ensure Admin has a Seller Profile (auto-creation for shared inventory access)
export async function ensureAdminSellerProfile(userId, email) {
    const defaultSlug = "knot-and-bloom-official";
    // Always return the official store if it already exists, regardless of who owns it
    const existingOfficialStore = await prisma.seller.findUnique({ where: { slug: defaultSlug } });
    if (existingOfficialStore)
        return existingOfficialStore.uid;
    const customer = await prisma.customer.findUnique({ where: { uid: userId } });
    if (!customer) {
        throw new Error("Admin user not found. Your session may be stale. Please log out and log in again.");
    }
    // Create Official Seller Profile, assigning the first admin as the technical owner
    const seller = await prisma.seller.create({
        data: {
            customerId: userId,
            name: "Knot & Bloom", // Default official name
            slug: defaultSlug,
            email: email,
            description: "Official Knot & Bloom Store",
            status: SellerStatus.ACTIVE, // Auto-active
            termsAccepted: true,
            termsAcceptedAt: new Date(),
        }
    });
    return seller.uid;
}
//# sourceMappingURL=sellerUtils.js.map