declare const _default: {
    getPaymentMethods: (userId: number) => Promise<{
        paymentMethods: {
            type: import("../../generated/prisma/index.js").$Enums.PaymentMethodType;
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            accountName: string;
            accountNumber: string;
            bankName: string | null;
        }[];
    }>;
    createPaymentMethod: (userId: number, input: unknown) => Promise<{
        paymentMethod: {
            type: import("../../generated/prisma/index.js").$Enums.PaymentMethodType;
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            accountName: string;
            accountNumber: string;
            bankName: string | null;
        };
    }>;
    updatePaymentMethod: (userId: number, paymentMethodId: number, input: unknown) => Promise<{
        paymentMethod: {
            type: import("../../generated/prisma/index.js").$Enums.PaymentMethodType;
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            accountName: string;
            accountNumber: string;
            bankName: string | null;
        };
    }>;
    deletePaymentMethod: (userId: number, paymentMethodId: number) => Promise<{
        success: boolean;
    }>;
    setDefaultPaymentMethod: (userId: number, paymentMethodId: number) => Promise<{
        paymentMethod: {
            type: import("../../generated/prisma/index.js").$Enums.PaymentMethodType;
            uid: number;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            isDefault: boolean;
            accountName: string;
            accountNumber: string;
            bankName: string | null;
        };
    }>;
};
export default _default;
//# sourceMappingURL=PaymentMethodController.d.ts.map