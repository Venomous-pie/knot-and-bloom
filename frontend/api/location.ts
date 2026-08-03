import { apiClient } from './client';

export const locationAPI = {
    getRegions: () => apiClient.get<{ code: string; name: string }[]>('/locations/regions'),
    getProvinces: (regCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/provinces/${regCode}`),
    getCities: (provCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/cities/${provCode}`),
    getBarangays: (citymunCode: string) => apiClient.get<{ code: string; name: string }[]>(`/locations/barangays/${citymunCode}`),
};
