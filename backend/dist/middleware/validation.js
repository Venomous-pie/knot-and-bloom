import { ZodError } from 'zod';
export const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    error: "Validation failed",
                    issues: error.issues
                });
            }
            return res.status(500).json({ error: "Internal validation error" });
        }
    };
};
//# sourceMappingURL=validation.js.map