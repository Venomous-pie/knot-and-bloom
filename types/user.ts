interface User {
    uid: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    address?: string | null;
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
