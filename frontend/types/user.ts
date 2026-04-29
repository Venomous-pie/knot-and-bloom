interface User {
    uid: number;
    name: string;
    email: string;
    role: string; // 'USER' | 'SELLER' | 'ADMIN'
    phone?: string | null;
    address?: string | null;
    avatar?: string | null;
    sellerId?: number;
    sellerStatus?: string; // 'PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'REJECTED'
    sellerHasSeenWelcomeModal?: boolean;
    sellerStoreName?: string;
    sellerSlug?: string;
    sellerRating?: string | number;
    sellerTotalSales?: string | number;
    sellerTotalOrders?: number;
    passwordResetRequired?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    loginWithGoogle: (data: { token?: string, accessToken?: string }) => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
    token: string | null;
}

export { AuthContextType, User };
