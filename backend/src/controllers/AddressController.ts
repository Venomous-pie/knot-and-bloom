import prisma from "../utils/prismaUtils.js";
import { z, ZodError } from "zod";
import ErrorHandler from "../error/errorHandler.js";
import { addressSchema, type AddressInput } from "../validators/addressValidator.js";

// Partial schema for update operations
const addressUpdateSchema = addressSchema.partial();
type AddressUpdateInput = z.infer<typeof addressUpdateSchema>;

/**
 * Get all addresses for a user
 */
const getAddresses = async (userId: number) => {
    const addresses = await prisma.address.findMany({
        where: { customerId: userId },
        orderBy: [
            { isDefault: 'desc' },
            { updatedAt: 'desc' }
        ]
    });

    return { addresses };
};

/**
 * Create a new address
 */
const createAddress = async (userId: number, input: unknown) => {
    let parsedInput: AddressInput;

    try {
        parsedInput = addressSchema.parse(input);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // If this is the first address or isDefault is true, handle default logic
    const existingAddresses = await prisma.address.count({ where: { customerId: userId } });
    const shouldBeDefault = existingAddresses === 0 || parsedInput.isDefault;

    // Use transaction to ensure only one default
    const address = await prisma.$transaction(async (tx) => {
        if (shouldBeDefault) {
            await tx.address.updateMany({
                where: { customerId: userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        return tx.address.create({
            data: {
                customerId: userId,
                label: parsedInput.label ?? null,
                fullName: parsedInput.fullName,
                phone: parsedInput.phone,
                streetAddress: parsedInput.streetAddress,
                aptSuite: parsedInput.aptSuite ?? null,
                city: parsedInput.city,
                stateProvince: parsedInput.stateProvince ?? null,
                postalCode: parsedInput.postalCode,
                country: parsedInput.country || "Philippines",
                ...(shouldBeDefault && { isDefault: true }),
            }
        });
    });

    return { address };
};

/**
 * Update an existing address
 */
const updateAddress = async (userId: number, addressId: number, input: unknown) => {
    // Verify ownership
    const existing = await prisma.address.findUnique({ where: { uid: addressId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to update this address");
    }

    let parsedInput: AddressUpdateInput;

    try {
        parsedInput = addressUpdateSchema.parse(input);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }

    // Handle default address change via transaction
    const address = await prisma.$transaction(async (tx) => {
        if (parsedInput.isDefault) {
            await tx.address.updateMany({
                where: { customerId: userId, isDefault: true },
                data: { isDefault: false }
            });
        }

        return tx.address.update({
            where: { uid: addressId },
            data: {
                ...(parsedInput.label && { label: parsedInput.label }),
                ...(parsedInput.fullName && { fullName: parsedInput.fullName }),
                ...(parsedInput.phone && { phone: parsedInput.phone }),
                ...(parsedInput.streetAddress && { streetAddress: parsedInput.streetAddress }),
                ...(parsedInput.aptSuite && { aptSuite: parsedInput.aptSuite }),
                ...(parsedInput.city && { city: parsedInput.city }),
                ...(parsedInput.stateProvince && { stateProvince: parsedInput.stateProvince }),
                ...(parsedInput.postalCode && { postalCode: parsedInput.postalCode }),
                ...(parsedInput.country && { country: parsedInput.country }),
                ...(parsedInput.isDefault !== undefined && { isDefault: parsedInput.isDefault }),
            }
        });
    });

    return { address };
};

/**
 * Delete an address
 */
const deleteAddress = async (userId: number, addressId: number) => {
    // Verify ownership
    const existing = await prisma.address.findUnique({ where: { uid: addressId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to delete this address");
    }

    // Check if this is the last address
    const addressCount = await prisma.address.count({ where: { customerId: userId } });
    if (addressCount <= 1) {
        throw new ErrorHandler.BadRequestError("You must have at least one address");
    }

    // Delete the address
    await prisma.address.delete({ where: { uid: addressId } });

    // If deleted address was default, set another as default
    if (existing.isDefault) {
        await prisma.address.updateMany({
            where: { customerId: userId },
            data: { isDefault: false }
        });
        const nextDefault = await prisma.address.findFirst({
            where: { customerId: userId },
            orderBy: { updatedAt: 'desc' }
        });
        if (nextDefault) {
            await prisma.address.update({
                where: { uid: nextDefault.uid },
                data: { isDefault: true }
            });
        }
    }

    return { success: true };
};

/**
 * Set an address as default
 */
const setDefaultAddress = async (userId: number, addressId: number) => {
    // Verify ownership
    const existing = await prisma.address.findUnique({ where: { uid: addressId } });
    if (!existing || existing.customerId !== userId) {
        throw new ErrorHandler.ForbiddenError("You do not have permission to modify this address");
    }

    // Use transaction to ensure only one default
    const address = await prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
            where: { customerId: userId, isDefault: true },
            data: { isDefault: false }
        });
        return tx.address.update({
            where: { uid: addressId },
            data: { isDefault: true }
        });
    });

    return { address };
};

export default {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
