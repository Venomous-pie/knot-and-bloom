export declare enum Role {
    USER = "USER",
    SELLER = "SELLER",
    ADMIN = "ADMIN"
}
export declare enum SellerStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    SUSPENDED = "SUSPENDED",
    BANNED = "BANNED",
    REJECTED = "REJECTED"
}
export interface AuthPayload {
    id: number;
    email?: string;
    role: Role;
    sellerId?: number;
    sellerStatus?: SellerStatus;
    passwordResetRequired?: boolean;
}
//# sourceMappingURL=authTypes.d.ts.map