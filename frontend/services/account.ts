import { apiClient } from './client';

export interface DeletionStatus {
    hasPendingDeletion: boolean;
    deletionRequestedAt?: string | null;
    deletionScheduledFor?: string | null;
}

export const accountAPI = {
    requestDeletion: (data: { reason?: string; password: string }) =>
        apiClient.post<{ success: boolean; message: string; deletionScheduledFor: string }>('/account/delete-request', data),
    cancelDeletion: () =>
        apiClient.delete<{ success: boolean; message: string }>('/account/delete-request'),
    getDeletionStatus: () =>
        apiClient.get<DeletionStatus>('/account/delete-status'),
};
