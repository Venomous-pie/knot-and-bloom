declare const _default: {
    requestAccountDeletion: (userId: number, input: unknown) => Promise<{
        success: boolean;
        message: string;
        reason: string | undefined;
    }>;
    cancelAccountDeletion: (userId: number) => Promise<{
        success: boolean;
        message: string;
    }>;
    getDeletionStatus: (userId: number) => Promise<{
        hasPendingDeletion: boolean;
        deletionRequestedAt: Date | null;
        deletionScheduledFor: Date | null;
    }>;
    processScheduledDeletions: () => Promise<{
        processed: number;
        deleted: number;
        errors: string[];
    }>;
};
export default _default;
//# sourceMappingURL=AccountController.d.ts.map