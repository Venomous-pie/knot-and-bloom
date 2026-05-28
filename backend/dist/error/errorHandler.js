export class CustomError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = this.constructor.name;
    }
}
export class ValidationError extends CustomError {
    issues;
    constructor(issues) {
        super("Validation failed", 400, 'VALIDATION_ERROR');
        this.issues = issues;
    }
}
export class DuplicateProductError extends CustomError {
    constructor(sku) {
        super(`Product with SKU "${sku}" already exists`, 409, 'DUPLICATE_PRODUCT');
    }
}
export class NotFoundError extends CustomError {
    constructor(resource, identifier) {
        super(`${resource} with identifier "${identifier}" not found`, 404, 'NOT_FOUND');
    }
}
export class DuplicateCustomerError extends CustomError {
    constructor(email) {
        super(`Looks like you already have an account. Sign in instead?`, 409, 'DUPLICATE_CUSTOMER');
    }
}
export class ForbiddenError extends CustomError {
    constructor(message = "Access denied") {
        super(message, 403, 'FORBIDDEN');
    }
}
export class ConflictError extends CustomError {
    constructor(message = "Resource conflict") {
        super(message, 409, 'CONFLICT');
    }
}
export class AuthenticationError extends CustomError {
    constructor(message = 'Authentication failed', code = 'AUTHENTICATION_ERROR') {
        super(message, 401, code);
    }
}
export class InsufficientStockError extends CustomError {
    constructor(message = 'Insufficient stock') {
        super(message, 400, 'INSUFFICIENT_STOCK');
    }
}
export class BadRequestError extends CustomError {
    constructor(message = 'Bad request') {
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
};
//# sourceMappingURL=errorHandler.js.map