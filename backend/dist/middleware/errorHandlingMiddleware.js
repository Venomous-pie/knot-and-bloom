import { CustomError, ValidationError } from "../error/errorHandler.js";
export const errorHandlingMiddleware = (err, req, res, next) => {
    console.error("Error:", err.stack);
    const isDev = process.env.NODE_ENV === 'development';
    if (err instanceof ValidationError) {
        return res.status(err.statusCode).json({
            message: err.message,
            error: err.message,
            code: err.code,
            issues: err.issues,
        });
    }
    if (err instanceof CustomError) {
        return res.status(err.statusCode).json({
            message: err.message,
            error: err.message,
            code: err.code,
        });
    }
    res.status(500).json({
        message: "Internal server error.",
        // Only expose error details in development
        ...(isDev && { detail: err.message }),
    });
};
//# sourceMappingURL=errorHandlingMiddleware.js.map