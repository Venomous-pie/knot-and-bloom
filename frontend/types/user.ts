import { LoginPayload, RegisterPayload } from '@/services/api';

enum Role {
    USER = 'USER',
    SELLER = 'SELLER',
    ADMIN = 'ADMIN',
}

enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING = 'PENDING',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED',
}

enum SellerStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    SUSPENDED = 'SUSPENDED',
    BANNED = 'BANNED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

interface SellerProfile {
    uid: number;
    name: string;
    slug: string;
    userId: number;
    user: User;
    logo?: string | null;
    banner?: string | null;
    status: SellerStatus;
    email: string;
    phone?: string | null;
    description?: string | null;
    businessAddress?: string | null;
    meetUpPoint?: string | null;
    socialMediaLink?: string | null;
    legalName?: string | null;
    businessType?: string | null;
    idType?: string | null;
    idNumber?: string | null;
    kycFlagged?: boolean;
    hasSeenWelcomeModal: boolean;
    rating?: number | null;
    totalSales?: number;
    totalOrders?: number;
    rejectionReason?: string | null;
}

interface User {
    uid: number;
    name: string;
    email: string;
    role: Role;
    phone?: string | null;
    address?: string | null;
    avatar?: string | null;
    passwordResetRequired?: boolean;
    googleId?: string | null;
    trustScore?: number;
    isVerified?: boolean;
    status?: UserStatus;
    createdAt?: string;
    updatedAt?: string;
    sellerProfile?: SellerProfile | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginPayload, returnTo?: string, rememberMe?: boolean) => Promise<void>;
    register: (data: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    loginWithGoogle: (data: { token?: string, accessToken?: string }, returnTo?: string) => Promise<void>;
    loginWithToken: (token: string, returnTo?: string) => Promise<void>;
    token: string | null;
}

export { AuthContextType, User, Role, UserStatus, SellerStatus };
