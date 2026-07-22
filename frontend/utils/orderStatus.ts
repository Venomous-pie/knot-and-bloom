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

export const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'PENDING': return 'To Pay';
        case 'CONFIRMED': return 'Confirmed';
        case 'PROCESSING': return 'Processing';
        case 'IN_PRODUCTION': return 'In Production';
        case 'READY_TO_SHIP': return 'Ready to Ship';
        case 'SHIPPED': return 'Shipped';
        case 'DELIVERED': return 'Delivered';
        case 'COMPLETED': return 'Completed';
        case 'CANCELLED': return 'Cancelled';
        case 'REFUNDED': return 'Refunded';
        case 'DISPUTED': return 'Disputed';
        default: return status;
    }
};