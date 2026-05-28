export declare class CustomError extends Error {
    message: string;
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode: number, code?: string | undefined);
}
export declare class ValidationError extends CustomError {
    issues: any[];
    constructor(issues: any[]);
}
export declare class DuplicateProductError extends CustomError {
    constructor(sku: string);
}
export declare class NotFoundError extends CustomError {
    constructor(resource: string, identifier: string);
}
export declare class DuplicateCustomerError extends CustomError {
    constructor(email: string);
}
export declare class ForbiddenError extends CustomError {
    constructor(message?: string);
}
export declare class ConflictError extends CustomError {
    constructor(message?: string);
}
export declare class AuthenticationError extends CustomError {
    constructor(message?: string, code?: string);
}
export declare class InsufficientStockError extends CustomError {
    constructor(message?: string);
}
export declare class BadRequestError extends CustomError {
    constructor(message?: string);
}
declare const _default: {
    AuthenticationError: typeof AuthenticationError;
    CustomError: typeof CustomError;
    ValidationError: typeof ValidationError;
    DuplicateProductError: typeof DuplicateProductError;
    NotFoundError: typeof NotFoundError;
    DuplicateCustomerError: typeof DuplicateCustomerError;
    ForbiddenError: typeof ForbiddenError;
    ConflictError: typeof ConflictError;
    InsufficientStockError: typeof InsufficientStockError;
    BadRequestError: typeof BadRequestError;
};
export default _default;
//# sourceMappingURL=errorHandler.d.ts.map