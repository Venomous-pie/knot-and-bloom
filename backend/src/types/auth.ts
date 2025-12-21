export enum Role {
    USER = 'USER',
    SELLER = 'SELLER',
    ADMIN = 'ADMIN'
}

export enum SellerStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED'
}

export interface AuthPayload {
    id: number;
    email: string;
    role: Role;
    sellerId?: number;
    sellerStatus?: SellerStatus;
    passwordResetRequired?: boolean;
}
