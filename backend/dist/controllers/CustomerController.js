import prisma from "../utils/prismaUtils.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from "zod";
import {} from "../types/authTypes.js";
import { OAuth2Client } from 'google-auth-library';
import ErrorHandler from "../error/errorHandler.js";
import { OtpService } from "../services/otpService.js";
import { RefreshTokenService } from "../services/RefreshTokenService.js";
import { customerLoginSchema, customerSchema, customerUpdateSchema, googleLoginSchema } from "../validators/customerValidator.js";
import { generateRandomName } from "../utils/nameGenerator.js";
import { ensureAdminSellerProfile } from "../utils/sellerUtils.js";
const customerRegisterController = async (input) => {
    let parsedInput;
    try {
        parsedInput = customerSchema.parse(input);
        // Check for existing user by email OR phone
        const existingCustomer = await prisma.customer.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
        });
        if (existingCustomer) {
            if (parsedInput.email && existingCustomer.email === parsedInput.email) {
                throw new ErrorHandler.DuplicateCustomerError(parsedInput.email);
            }
            if (parsedInput.phone && existingCustomer.phone === parsedInput.phone) {
                // Create a custom error or reuse DuplicateCustomerError with phone message
                throw new ErrorHandler.DuplicateCustomerError(parsedInput.phone);
            }
        }
        // Verify OTP for all registrations (email or phone)
        const target = parsedInput.email || parsedInput.phone;
        if (!target) {
            throw new ErrorHandler.ValidationError([{ message: "Email or phone is required", path: ["email", "phone"] }]);
        }
        if (!parsedInput.otp) {
            throw new ErrorHandler.ValidationError([{ message: "OTP is required for registration", path: ["otp"] }]);
        }
        const isValid = await OtpService.verifyOTP(target, parsedInput.otp, 'REGISTRATION');
        if (!isValid) {
            throw new ErrorHandler.AuthenticationError("Invalid or expired OTP");
        }
        const hashedPassword = await bcrypt.hash(parsedInput.password, 10);
        const finalName = parsedInput.name || generateRandomName();
        const customer = await prisma.customer.create({
            data: {
                name: finalName,
                email: parsedInput.email || null,
                password: hashedPassword,
                phone: parsedInput.phone || null,
                address: parsedInput.address || null,
            },
        });
        // Auto-create seller profile for ADMIN if they register as admin (unlikely but possible via manual DB tweak later)
        let sellerId;
        if (customer.role === 'ADMIN' && customer.email) {
            sellerId = await ensureAdminSellerProfile(customer.uid, customer.email);
        }
        // Generate token for auto-login
        const payload = {
            id: customer.uid,
            ...(customer.email ? { email: customer.email } : {}),
            role: customer.role,
            ...(sellerId ? { sellerId } : {})
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = await RefreshTokenService.generate({
            userId: customer.uid,
            ...(customer.email && { email: customer.email }),
            role: customer.role,
        });
        return {
            token,
            refreshToken,
            customer: {
                uid: customer.uid,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                role: customer.role,
                passwordResetRequired: customer.passwordResetRequired,
                sellerId: undefined, // New users are not sellers yet
                sellerStatus: undefined,
                sellerSlug: undefined,
                sellerRating: undefined,
                sellerTotalSales: undefined,
                sellerTotalOrders: undefined,
                sellerRejectionReason: undefined
            }
        };
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
};
const customerLoginController = async (input) => {
    let parsedInput;
    try {
        parsedInput = customerLoginSchema.parse(input);
        const customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
            include: { sellerProfile: true }
        });
        if (!customer) {
            throw new ErrorHandler.AuthenticationError("No account found with those credentials.", 'USER_NOT_FOUND');
        }
        if (customer.deletedAt) {
            throw new ErrorHandler.AuthenticationError("This account has been deleted.", 'USER_DELETED');
        }
        if (!customer.password) {
            throw new ErrorHandler.AuthenticationError("This account uses Google Sign-In. Please continue with Google.", 'NO_PASSWORD_SET');
        }
        if (customer.role === 'ADMIN' && customer.email) {
            const officialSellerId = await ensureAdminSellerProfile(customer.uid, customer.email);
            const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
            if (officialSeller)
                customer.sellerProfile = officialSeller;
        }
        const isPasswordValid = await bcrypt.compare(parsedInput.password, customer.password);
        if (!isPasswordValid) {
            throw new ErrorHandler.AuthenticationError("Incorrect password.", 'WRONG_PASSWORD');
        }
        const payload = {
            id: customer.uid,
            ...(customer.email ? { email: customer.email } : {}),
            role: customer.role,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
            ...(customer.passwordResetRequired && { passwordResetRequired: customer.passwordResetRequired })
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }); // 7d expiry for better UX
        const refreshToken = await RefreshTokenService.generate({
            userId: customer.uid,
            ...(customer.email && { email: customer.email }),
            role: customer.role,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
        });
        return {
            token,
            refreshToken,
            customer: {
                uid: customer.uid,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                role: customer.role,
                avatar: customer.avatar,
                passwordResetRequired: customer.passwordResetRequired,
                sellerId: customer.sellerProfile?.uid,
                sellerStatus: customer.sellerProfile?.status,
                sellerHasSeenWelcomeModal: customer.sellerProfile?.hasSeenWelcomeModal,
                sellerStoreName: customer.sellerProfile?.name,
                sellerSlug: customer.sellerProfile?.slug,
                sellerRating: customer.sellerProfile?.rating,
                sellerTotalSales: customer.sellerProfile?.totalSales,
                sellerTotalOrders: customer.sellerProfile?.totalOrders,
                sellerRejectionReason: customer.sellerProfile?.rejectionReason
            }
        };
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        // Rethrow known errors or generic ones
        throw error;
    }
};
const getCustomerProfile = async (userId) => {
    const customer = await prisma.customer.findUnique({
        where: { uid: userId },
        include: { sellerProfile: true }
    });
    if (!customer) {
        throw new ErrorHandler.NotFoundError('Customer', String(userId));
    }
    if (customer.role === 'ADMIN' && customer.email) {
        const officialSellerId = await ensureAdminSellerProfile(customer.uid, customer.email);
        const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
        if (officialSeller)
            customer.sellerProfile = officialSeller;
    }
    const { password, ...customerData } = customer;
    const payload = {
        id: customer.uid,
        ...(customer.email ? { email: customer.email } : {}),
        role: customer.role,
        ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
        ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
        ...(customer.passwordResetRequired && { passwordResetRequired: customer.passwordResetRequired })
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    const refreshToken = await RefreshTokenService.generate({
        userId: customer.uid,
        ...(customer.email && { email: customer.email }),
        role: customer.role,
        ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
        ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
    });
    return {
        customer: {
            ...customerData,
            sellerId: customer.sellerProfile?.uid,
            sellerStatus: customer.sellerProfile?.status,
            sellerHasSeenWelcomeModal: customer.sellerProfile?.hasSeenWelcomeModal,
            sellerStoreName: customer.sellerProfile?.name,
            sellerSlug: customer.sellerProfile?.slug,
            sellerRating: customer.sellerProfile?.rating,
            sellerTotalSales: customer.sellerProfile?.totalSales,
            sellerTotalOrders: customer.sellerProfile?.totalOrders,
            sellerRejectionReason: customer.sellerProfile?.rejectionReason
        },
        token,
        refreshToken,
    };
};
const updateCustomerProfile = async (userId, input) => {
    let parsedInput;
    try {
        parsedInput = customerUpdateSchema.parse(input);
        // Remove undefined keys to avoid exactOptionalPropertyTypes issues
        const updateData = Object.fromEntries(Object.entries(parsedInput).filter(([_, v]) => v !== undefined));
        // If password is provided, hash it and clear passwordResetRequired flag
        if (parsedInput.password) {
            updateData.password = await bcrypt.hash(parsedInput.password, 10);
            updateData.passwordResetRequired = false;
        }
        const customer = await prisma.customer.update({
            where: { uid: userId },
            data: updateData
        });
        const { password, ...customerData } = customer;
        return customerData;
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
};
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleLoginController = async (input) => {
    let parsedInput;
    try {
        parsedInput = googleLoginSchema.parse(input);
        const ticket = await client.verifyIdToken({
            idToken: parsedInput.token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new ErrorHandler.AuthenticationError("Invalid Google Token");
        }
        const { email, sub: googleId, name, picture } = payload;
        // Find existing customer by googleId OR email
        let customer = await prisma.customer.findFirst({
            where: {
                OR: [
                    { googleId },
                    { email }
                ]
            },
            include: { sellerProfile: true }
        });
        if (customer) {
            if (customer.deletedAt) {
                throw new ErrorHandler.AuthenticationError("This account has been deleted.", 'USER_DELETED');
            }
            // Link googleId if not linked yet, or update avatar if missing
            if (!customer.googleId || (!customer.avatar && picture)) {
                customer = await prisma.customer.update({
                    where: { uid: customer.uid },
                    data: {
                        googleId,
                        ...(!customer.avatar && picture ? { avatar: picture } : {})
                    },
                    include: { sellerProfile: true }
                });
            }
        }
        else {
            // Create new customer
            customer = await prisma.customer.create({
                data: {
                    email,
                    googleId,
                    name: name || generateRandomName(),
                    avatar: picture || null,
                    // password is optional/null for Google users
                },
                include: { sellerProfile: true }
            });
        }
        if (customer.role === 'ADMIN' && customer.email) {
            const officialSellerId = await ensureAdminSellerProfile(customer.uid, customer.email);
            const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
            if (officialSeller)
                customer.sellerProfile = officialSeller;
        }
        const jwtPayload = {
            id: customer.uid,
            email: customer.email,
            role: customer.role,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
        };
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });
        const refreshToken = await RefreshTokenService.generate({
            userId: customer.uid,
            ...(customer.email && { email: customer.email }),
            role: customer.role,
            ...(customer.sellerProfile?.uid && { sellerId: customer.sellerProfile.uid }),
            ...(customer.sellerProfile?.status && { sellerStatus: customer.sellerProfile.status }),
        });
        return {
            token,
            refreshToken,
            customer: {
                uid: customer.uid,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                role: customer.role,
                avatar: customer.avatar,
                passwordResetRequired: customer.passwordResetRequired,
                sellerId: customer.sellerProfile?.uid,
                sellerStatus: customer.sellerProfile?.status,
                sellerHasSeenWelcomeModal: customer.sellerProfile?.hasSeenWelcomeModal,
                sellerStoreName: customer.sellerProfile?.name,
                sellerSlug: customer.sellerProfile?.slug,
                sellerRating: customer.sellerProfile?.rating,
                sellerTotalSales: customer.sellerProfile?.totalSales,
                sellerTotalOrders: customer.sellerProfile?.totalOrders,
                sellerRejectionReason: customer.sellerProfile?.rejectionReason
            }
        };
    }
    catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        console.error("Google Login Error:", error);
        throw new ErrorHandler.AuthenticationError("Google Authentication Failed");
    }
};
export default {
    customerRegisterController,
    customerLoginController,
    getCustomerProfile,
    updateCustomerProfile,
    googleLoginController
};
//# sourceMappingURL=CustomerController.js.map