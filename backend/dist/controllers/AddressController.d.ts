declare const _default: {
    getAddresses: (userId: number) => Promise<{
        addresses: {
            uid: number;
            phone: string;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            label: string | null;
            fullName: string;
            streetAddress: string;
            aptSuite: string | null;
            city: string;
            region: string | null;
            province: string | null;
            barangay: string | null;
            stateProvince: string | null;
            postalCode: string;
            country: string;
            isDefault: boolean;
        }[];
    }>;
    createAddress: (userId: number, input: unknown) => Promise<{
        address: {
            uid: number;
            phone: string;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            label: string | null;
            fullName: string;
            streetAddress: string;
            aptSuite: string | null;
            city: string;
            region: string | null;
            province: string | null;
            barangay: string | null;
            stateProvince: string | null;
            postalCode: string;
            country: string;
            isDefault: boolean;
        };
    }>;
    updateAddress: (userId: number, addressId: number, input: unknown) => Promise<{
        address: {
            uid: number;
            phone: string;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            label: string | null;
            fullName: string;
            streetAddress: string;
            aptSuite: string | null;
            city: string;
            region: string | null;
            province: string | null;
            barangay: string | null;
            stateProvince: string | null;
            postalCode: string;
            country: string;
            isDefault: boolean;
        };
    }>;
    deleteAddress: (userId: number, addressId: number) => Promise<{
        success: boolean;
    }>;
    setDefaultAddress: (userId: number, addressId: number) => Promise<{
        address: {
            uid: number;
            phone: string;
            customerId: number;
            createdAt: Date;
            updatedAt: Date;
            label: string | null;
            fullName: string;
            streetAddress: string;
            aptSuite: string | null;
            city: string;
            region: string | null;
            province: string | null;
            barangay: string | null;
            stateProvince: string | null;
            postalCode: string;
            country: string;
            isDefault: boolean;
        };
    }>;
};
export default _default;
//# sourceMappingURL=AddressController.d.ts.map