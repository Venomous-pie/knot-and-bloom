/**
 * Shared order status utilities
 * Colors are sourced from theme.colors.statusColors — the single source of truth.
 * Labels remain here since they're presentation copy, not theme data.
 */

import { theme } from '../constants/theme';

type StatusKey = keyof typeof theme.colors.statusColors;

const isStatusKey = (status: string): status is StatusKey =>
    status in theme.colors.statusColors;

const getStatusEntry = (status: string) =>
    isStatusKey(status)
        ? theme.colors.statusColors[status]
        : theme.colors.statusColors.DEFAULT;

export const getStatusColor = (status: string): string =>
    getStatusEntry(status).fg;

export const getStatusBgColor = (status: string): string =>
    getStatusEntry(status).bg;

type ValidStatusKey = Exclude<StatusKey, 'DEFAULT'>;

const STATUS_LABELS: Record<ValidStatusKey, string> = {
    PENDING: 'To Pay',
    CONFIRMED: 'Confirmed',
    PROCESSING: 'Processing',
    IN_PRODUCTION: 'In Production',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    DISPUTED: 'Disputed',
};

export const getStatusLabel = (status: string): string => {
    if (isStatusKey(status)) {
        if (status === 'DEFAULT') return status;
        return STATUS_LABELS[status as ValidStatusKey];
    }

    if (__DEV__) {
        console.warn(`[orderStatus] Unrecognized order status received: "${status}"`);
    }
    return status;
};