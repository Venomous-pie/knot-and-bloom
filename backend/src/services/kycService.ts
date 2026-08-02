export const kycService = {
    /**
     * Simulates verifying a seller's identity using a third-party KYC provider.
     * In a real application, this would call Onfido, Persona, or a similar service.
     */
    verifyIdentity: async (idType: string, idNumber: string, idPhotos: string[]): Promise<boolean> => {
        console.log(`[KYCService] Verifying ID: ${idType} - ${idNumber}`);
        
        // Basic mock validation rules
        if (!idType || !idNumber || !idPhotos || idPhotos.length === 0) {
            return false;
        }

        // Simulate a small delay for API call
        await new Promise(r => setTimeout(r, 1500));

        // Let's assume an ID number starting with 'REJECT' always fails (for testing),
        // otherwise it simulates a successful AI verification.
        if (idNumber.toUpperCase().startsWith('REJECT')) {
            console.log(`[KYCService] Verification FAILED for ${idNumber}`);
            return false;
        }

        console.log(`[KYCService] Verification PASSED for ${idNumber}`);
        return true;
    }
};
