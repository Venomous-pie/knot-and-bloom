import { apiClient } from './client';

export const servicesAPI = {
    ocr: (imageUrl: string) =>
        apiClient.post<{ success: boolean; text: string }>('/services/ocr', { imageUrl }),
};
