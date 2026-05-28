export declare class OtpService {
    /**
     * Generate a 6-digit OTP and store it in the database.
     * In simulation mode, this also logs the OTP to the console.
     */
    static generateAndSendOTP(target: string, type: 'REGISTRATION' | 'PASSWORD_RESET'): Promise<void>;
    /**
     * Verify the OTP. Returns true if valid, false otherwise.
     * Deletes the OTP upon successful verification to prevent reuse.
     */
    static verifyOTP(target: string, code: string, type: 'REGISTRATION' | 'PASSWORD_RESET'): Promise<boolean>;
}
//# sourceMappingURL=otpService.d.ts.map