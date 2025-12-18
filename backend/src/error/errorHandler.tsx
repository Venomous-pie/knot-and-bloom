export class ValidationError extends Error {
    constructor(public issues: any[]) {
        super("Validation failed");
        this.name = "ValidationError";
    }
}

export class DuplicateProductError extends Error {
    constructor(sku: string) {
        super(`Product with SKU "${sku}" already exists`);
        this.name = "DuplicateProductError";
    }
}

export class NotFoundError extends Error {
    constructor(resource: string, identifier: string) {
        super(`${resource} with identifier "${identifier}" not found`);
        this.name = "NotFoundError";
    }
}

export class DuplicateCustomerError extends Error {
    constructor(email: string) {
        super(`Customer with email "${email}" already exists`);
        this.name = "DuplicateCustomerError";
    }
}
