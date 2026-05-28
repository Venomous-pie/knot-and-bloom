import prisma from '../utils/prismaUtils.js';
import ErrorHandler from '../error/errorHandler.js';
export class OtpService {
    /**
     * Generate a 6-digit OTP and store it in the database.
     * In simulation mode, this also logs the OTP to the console.
     */
    static async generateAndSendOTP(target, type) {
        // 1. Check if user exists (for REGISTRATION)
        if (type === 'REGISTRATION') {
            const isEmail = target.includes('@');
            const existingCustomer = await prisma.customer.findFirst({
                where: isEmail ? { email: target } : { phone: target }
            });
            if (existingCustomer) {
                throw new ErrorHandler.ConflictError(isEmail ? "Email already registered." : "Phone number already registered.");
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
            error.statusCode = 429;
            error.retryAfter = timeLeft;
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
        // TODO: Integrate real SMS provider here (Twilio/Firebase/SNS)
    }
    /**
     * Verify the OTP. Returns true if valid, false otherwise.
     * Deletes the OTP upon successful verification to prevent reuse.
     */
    static async verifyOTP(target, code, type) {
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
//# sourceMappingURL=otpService.js.map