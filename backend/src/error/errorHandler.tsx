export class CustomError extends Error {
    constructor(public message: string, public statusCode: number, public code?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ValidationError extends CustomError {
    constructor(public issues: any[]) {
        super("Validation failed", 400, 'VALIDATION_ERROR');
    }
}

export class DuplicateProductError extends CustomError {
    constructor(sku: string) {
        super(`Product with SKU "${sku}" already exists`, 409, 'DUPLICATE_PRODUCT');
    }
}

export class NotFoundError extends CustomError {
    constructor(resource: string, identifier: string) {
        super(`${resource} with identifier "${identifier}" not found`, 404, 'NOT_FOUND');
    }
}

export class DuplicateCustomerError extends CustomError {
    constructor(email: string) {
        super(`Customer with email "${email}" already exists`, 409, 'DUPLICATE_CUSTOMER');
    }
}

export class ForbiddenError extends CustomError {
    constructor(message: string = "Access denied") {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ConflictError extends CustomError {
    constructor(message: string = "Resource conflict") {
        super(message, 409, 'CONFLICT');
    }
}

export class AuthenticationError extends CustomError {
     constructor(message: string = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

export class InsufficientStockError extends CustomError {
    constructor(message: string = 'Insufficient stock') {
        super(message, 400, 'INSUFFICIENT_STOCK');
    }
}

export class BadRequestError extends CustomError {
    constructor(message: string = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}

export default {
    AuthenticationError,
    CustomError,
    ValidationError,
    DuplicateProductError,
    NotFoundError,
    DuplicateCustomerError,
    ForbiddenError,
    ConflictError,
    InsufficientStockError,
    BadRequestError
}