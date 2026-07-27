import prisma from '../utils/prismaUtils.js';
import ErrorHandler from '../error/errorHandler.js';
import { sendEmail } from '../utils/emailUtils.js';

export class OtpService {
    /**
     * Generate a 6-digit OTP and store it in the database.
     * In simulation mode, this also logs the OTP to the console.
     */
    static async generateAndSendOTP(target: string, type: 'REGISTRATION' | 'PASSWORD_RESET'): Promise<void> {
        const isEmail = target.includes('@');

        // 1. Check if user exists (for REGISTRATION)
        if (type === 'REGISTRATION') {
            const existingCustomer = await prisma.customer.findFirst({
                where: isEmail ? { email: target } : { phone: target }
            });
            if (existingCustomer) {
                throw new ErrorHandler.ConflictError(
                    isEmail ? "Email already registered." : "Phone number already registered."
                );
            }
        }

        // 2. Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Set expiration (e.g., 5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Check for rate limit (1 minute)
        const existing = await prisma.verification.findFirst({
            where: { target, type },
            orderBy: { createdAt: 'desc' }
        });

        if (existing && existing.createdAt > new Date(Date.now() - 60 * 1000)) {
            const timeLeft = Math.ceil((existing.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000);
            const error = new Error(`Please wait ${timeLeft} seconds before resending.`);
            (error as any).statusCode = 429;
            (error as any).retryAfter = timeLeft;
            throw error;
        }

        // 3. Store in DB (invalidate old codes for this target/type)
        await prisma.verification.deleteMany({
            where: { target, type }
        });

        await prisma.verification.create({
            data: {
                target,
                code,
                type,
                expiresAt
            }
        });

        // 4. SIMULATION: Log to console
        console.log(`\n==================================================`);
        console.log(`[OTP SIMULATION] Code for ${target}: ${code}`);
        console.log(`==================================================\n`);

        // 5. Send actual email or SMS
        if (isEmail) {
            const subject = type === 'REGISTRATION' ? 'Your Registration Code' : 'Your Password Reset Code';
            const text = `Your verification code is: ${code}\nThis code will expire in 5 minutes.`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #2c3e50;">Knot & Bloom Verification</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 32px; letter-spacing: 4px; color: #2c3e50; background: #f5f5f5; padding: 15px; text-align: center; border-radius: 8px;">${code}</h1>
                    <p>This code will expire in <strong>5 minutes</strong>.</p>
                    <p style="font-size: 14px; color: #7f8c8d; margin-top: 30px;">If you did not request this code, please ignore this email.</p>
                </div>
            `;
            // Fire and forget to prevent slow HTTP responses
            sendEmail(target, subject, text, html).catch(err => {
                console.error(`Background email send failed for ${target}:`, err);
            });
        } else {
            // TODO: Integrate real SMS provider here (Twilio/Firebase/SNS)
        }
    }

    /**
     * Verify the OTP. Returns true if valid, false otherwise.
     * Deletes the OTP upon successful verification to prevent reuse.
     */
    static async verifyOTP(target: string, code: string, type: 'REGISTRATION' | 'PASSWORD_RESET'): Promise<boolean> {
        const record = await prisma.verification.findFirst({
            where: {
                target,
                type,
                code,
                expiresAt: { gt: new Date() } // Must not be expired
            }
        });

        if (record) {
            // Delete record to prevent reuse
            await prisma.verification.delete({ where: { uid: record.uid } });
            return true;
        }

        return false;
    }
}
