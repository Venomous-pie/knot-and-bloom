/**
 * Shared order status utilities
 * Provides consistent status colors and labels across the app
 */

export const getStatusColor = (status: string): string => {
    switch (status) {
        case 'PENDING': return '#8D6E63'; // Soft Brown
        case 'CONFIRMED': return '#5C6BC0'; // Soft Indigo
        case 'PROCESSING': return '#5C6BC0';
        case 'IN_PRODUCTION': return '#7E57C2'; // Soft Deep Purple
        case 'READY_TO_SHIP': return '#26A69A'; // Soft Teal
        case 'SHIPPED': return '#7E57C2';
        case 'DELIVERED': return '#66BB6A'; // Soft Green
        case 'COMPLETED': return '#66BB6A';
        case 'CANCELLED': return '#EF5350'; // Soft Red
        case 'REFUNDED': return '#FF7043'; // Soft Orange
        case 'DISPUTED': return '#FFA726'; // Soft Amber
        default: return '#78909C'; // Blue Grey
    }
};

export const getStatusBgColor = (status: string): string => {
    switch (status) {
        case 'PENDING': return '#EFEBE9';
        case 'CONFIRMED': return '#E8EAF6';
        case 'PROCESSING': return '#E8EAF6';
        case 'IN_PRODUCTION': return '#EDE7F6';
        case 'READY_TO_SHIP': return '#E0F2F1';
        case 'SHIPPED': return '#EDE7F6';
        case 'DELIVERED': return '#E8F5E9';
        case 'COMPLETED': return '#E8F5E9';
        case 'CANCELLED': return '#FFEBEE';
        case 'REFUNDED': return '#FBE9E7';
        case 'DISPUTED': return '#FFF3E0';
        default: return '#ECEFF1';
    }
};

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
