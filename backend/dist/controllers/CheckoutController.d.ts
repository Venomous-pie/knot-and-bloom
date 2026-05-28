import type { Request, Response } from 'express';
declare const _default: {
    initiateCheckout: (req: Request, res: Response) => Promise<void>;
    getCheckoutSession: (req: Request, res: Response) => Promise<void>;
    validateCheckout: (req: Request, res: Response) => Promise<void>;
    processPayment: (req: Request, res: Response) => Promise<void>;
    completeCheckout: (req: Request, res: Response) => Promise<void>;
    cancelCheckout: (req: Request, res: Response) => Promise<void>;
    getPaymentMethods: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=CheckoutController.d.ts.map