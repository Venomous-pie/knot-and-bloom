import prisma from "../utils/prismaUtils.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ZodError } from "zod";

import { type AuthPayload } from "../types/authTypes.js";
import { OAuth2Client } from 'google-auth-library';

import ErrorHandler from "../error/errorHandler.js";
import { OtpService } from "../services/otpService.js";
import { RefreshTokenService } from "../services/RefreshTokenService.js";

import {
    userLoginSchema,
    userSchema,
    userUpdateSchema,
    type UserInput,
    type UserLoginInput,
    type UserUpdateInput,
    googleLoginSchema,
    type GoogleLoginInput
} from "../validators/userValidator.js";

import { generateRandomName } from "../utils/nameGenerator.js";
import { ensureAdminSellerProfile } from "../utils/sellerUtils.js";

const userRegisterController = async (input: unknown) => {
    let parsedInput: UserInput;

    try {
        parsedInput = userSchema.parse(input);

        // Check for existing user by email OR phone
        const existinguser = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
        });

        if (existinguser) {
            if (parsedInput.email && existinguser.email === parsedInput.email) {
                throw new ErrorHandler.DuplicateUserError(parsedInput.email);
            }
            if (parsedInput.phone && existinguser.phone === parsedInput.phone) {
                // Create a custom error or reuse DuplicateuserError with phone message
                throw new ErrorHandler.DuplicateUserError(parsedInput.phone);
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

        const user = await prisma.user.create({
            data: {
                name: finalName,
                email: parsedInput.email,
                phone: parsedInput.phone || null,
                password: hashedPassword,
                address: parsedInput.address || null,
            },
        });

        // Auto-create seller profile for ADMIN if they register as admin (unlikely but possible via manual DB tweak later)
        let sellerId;
        if (user.role === 'ADMIN' && user.email) {
            sellerId = await ensureAdminSellerProfile(user.uid, user.email);
        }

        // Generate token for auto-login
        const payload: AuthPayload = {
            id: user.uid,
            email: user.email,
            role: user.role as any,
            ...(sellerId ? { sellerId } : {})
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
        const refreshToken = await RefreshTokenService.generate({
            userId: user.uid,
            ...(user.email && { email: user.email }),
            role: user.role,
        });

        return {
            token,
            refreshToken,
            user: {
                uid: user.uid,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                passwordResetRequired: user.passwordResetRequired,
                sellerId: undefined, // New users are not sellers yet
                sellerStatus: undefined,
                sellerSlug: undefined,
                sellerRating: undefined,
                sellerTotalSales: undefined,
                sellerTotalOrders: undefined,
                sellerRejectionReason: undefined
            }
        };
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
}

const userLoginController = async (input: unknown) => {
    let parsedInput: UserLoginInput;

    try {
        parsedInput = userLoginSchema.parse(input);

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    ...(parsedInput.email ? [{ email: parsedInput.email }] : []),
                    ...(parsedInput.phone ? [{ phone: parsedInput.phone }] : [])
                ]
            },
            include: { sellerProfile: true }
        });

        if (!user) {
            throw new ErrorHandler.AuthenticationError("No account found with those credentials.", 'USER_NOT_FOUND');
        }

        if (user.deletedAt) {
            throw new ErrorHandler.AuthenticationError("This account has been deleted.", 'USER_DELETED');
        }

        if (!user.password) {
            throw new ErrorHandler.AuthenticationError("This account uses Google Sign-In. Please continue with Google.", 'NO_PASSWORD_SET');
        }

        if (user.role === 'ADMIN' && user.email) {
            const officialSellerId = await ensureAdminSellerProfile(user.uid, user.email);
            const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
            if (officialSeller) user.sellerProfile = officialSeller;
        }

        const isPasswordValid = await bcrypt.compare(parsedInput.password, user.password);

        if (!isPasswordValid) {
            throw new ErrorHandler.AuthenticationError("Incorrect password.", 'WRONG_PASSWORD');
        }

        const payload: AuthPayload = {
            id: user.uid,
            email: user.email,
            role: user.role as any,
            ...(user.sellerProfile?.uid && { sellerId: user.sellerProfile.uid }),
            ...(user.sellerProfile?.status && { sellerStatus: user.sellerProfile.status as any }),
            ...(user.passwordResetRequired && { passwordResetRequired: user.passwordResetRequired })
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' }); // 7d expiry for better UX
        const refreshToken = await RefreshTokenService.generate({
            userId: user.uid,
            ...(user.email && { email: user.email }),
            role: user.role,
            ...(user.sellerProfile?.uid && { sellerId: user.sellerProfile.uid }),
            ...(user.sellerProfile?.status && { sellerStatus: user.sellerProfile.status }),
        });

        return {
            token,
            refreshToken,
            user: {
                uid: user.uid,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                avatar: user.avatar,
                passwordResetRequired: user.passwordResetRequired,
                ...(user.sellerProfile && { sellerProfile: user.sellerProfile }),
            }
        };

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        // Rethrow known errors or generic ones
        throw error;
    }
}

const getUserProfile = async (userId: number) => {
    const user = await prisma.user.findUnique({
        where: { uid: userId },
        include: { sellerProfile: true }
    });

    if (!user) {
        throw new ErrorHandler.NotFoundError('user', String(userId));
    }

    if (user.role === 'ADMIN' && user.email) {
        const officialSellerId = await ensureAdminSellerProfile(user.uid, user.email);
        const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
        if (officialSeller) user.sellerProfile = officialSeller;
    }

    const { password, ...userData } = user;

    return {
        user: {
            ...userData,
        }
    };
};

const updateUserProfile = async (userId: number, input: unknown) => {
    let parsedInput: UserUpdateInput;

    try {
        parsedInput = userUpdateSchema.parse(input);

        // Remove undefined keys to avoid exactOptionalPropertyTypes issues
        const updateData: any = Object.fromEntries(
            Object.entries(parsedInput).filter(([_, v]) => v !== undefined)
        );

        // If password is provided, hash it and clear passwordResetRequired flag
        if (parsedInput.password) {
            updateData.password = await bcrypt.hash(parsedInput.password, 10);
            updateData.passwordResetRequired = false;
        }

        const user = await prisma.user.update({
            where: { uid: userId },
            data: updateData
        });

        const { password, ...userData } = user;
        return userData;

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        throw error;
    }
}



const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLoginController = async (input: unknown) => {
    let parsedInput: GoogleLoginInput;

    try {
        parsedInput = googleLoginSchema.parse(input);

        const ticket = await client.verifyIdToken({
            idToken: parsedInput.token,
            audience: process.env.GOOGLE_CLIENT_ID!,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            throw new ErrorHandler.AuthenticationError("Invalid Google Token");
        }

        const { email, sub: googleId, name, picture } = payload;

        // Find existing user by googleId OR email
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { googleId },
                    { email }
                ]
            },
            include: { sellerProfile: true }
        });

        if (user) {
            if (user.deletedAt) {
                throw new ErrorHandler.AuthenticationError("This account has been deleted.", 'USER_DELETED');
            }

            // Link googleId if not linked yet, or update avatar if missing
            if (!user.googleId || (!user.avatar && picture)) {
                user = await prisma.user.update({
                    where: { uid: user.uid },
                    data: {
                        googleId,
                        ...(!user.avatar && picture ? { avatar: picture } : {})
                    },
                    include: { sellerProfile: true }
                });
            }
        } else {
            // Create new user
            user = await prisma.user.create({
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

        if (user.role === 'ADMIN' && user.email) {
            const officialSellerId = await ensureAdminSellerProfile(user.uid, user.email);
            const officialSeller = await prisma.seller.findUnique({ where: { uid: officialSellerId } });
            if (officialSeller) user.sellerProfile = officialSeller;
        }

        const jwtPayload: AuthPayload = {
            id: user.uid,
            email: user.email!,
            role: user.role as any,
            ...(user.sellerProfile?.uid && { sellerId: user.sellerProfile.uid }),
            ...(user.sellerProfile?.status && { sellerStatus: user.sellerProfile.status as any }),
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET!, { expiresIn: '7d' });
        const refreshToken = await RefreshTokenService.generate({
            userId: user.uid,
            ...(user.email && { email: user.email }),
            role: user.role,
            ...(user.sellerProfile?.uid && { sellerId: user.sellerProfile.uid }),
            ...(user.sellerProfile?.status && { sellerStatus: user.sellerProfile.status }),
        });

        return {
            token,
            refreshToken,
            user: {
                uid: user.uid,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role,
                avatar: user.avatar,
                passwordResetRequired: user.passwordResetRequired,
            }
        };

    } catch (error) {
        if (error instanceof ZodError) {
            throw new ErrorHandler.ValidationError(error.issues);
        }
        console.error("Google Login Error:", error);
        throw new ErrorHandler.AuthenticationError("Google Authentication Failed");
    }
}

export default {
    userRegisterController,
    userLoginController,
    getUserProfile,
    updateUserProfile,
    googleLoginController
}
