interface User {
    uid: number;
    name: string;
    email: string;
    role: string; // 'USER' | 'SELLER' | 'ADMIN'
    phone?: string | null;
    address?: string | null;
    sellerId?: number;
    sellerStatus?: string; // 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED'
    sellerHasSeenWelcomeModal?: boolean;
    passwordResetRequired?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export { AuthContextType, User };
