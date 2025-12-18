import Router from 'express';
import { getProducts, postProduct, searchProducts } from '../controllers/ProductController.js';
import { DuplicateProductError, NotFoundError, ValidationError } from '../error/errorHandler.js';

const router = Router();

router.post('/post-product', async (req, res) => {
    try {
        // console.log("Request body:", req.body); 
        const product = await postProduct(req.body);

        res.status(201).json({
            success: true,
            message: "Product posted successfully.",
            data: product
        });
    } catch (error) {
        console.error("Route error:", error);

        // Handle validation errors
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        // Handle duplicate product errors
        if (error instanceof DuplicateProductError) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }

        // Handle Prisma errors
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as any;
            if (prismaError.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: "A product with this unique field already exists"
                });
            }
        }

        // Handle generic errors
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "An unexpected error occurred"
        });
    }
});

router.get('/get-product', async (req, res) => {
    try {
        const result = await getProducts(req.query);

        return res.status(200).json({
            success: true,
            products: result.products,
            total: result.total,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error(error);

        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                message: 'Product not found.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
        });
    }

});

router.get('/search-product', async (req, res) => {
    try {
        const { searchTerm, limit } = req.query;

        if (typeof searchTerm !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'searchTerm query parameter is required and must be a string.',
            });
        }

        const parsedLimit = limit ? parseInt(limit as string) : 20;

        const products = await searchProducts(searchTerm, parsedLimit);

        return res.json({
            success: true,
            products: products,
            count: products.length
        });

    } catch (error) {
        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: error.message || 'Validation failed',
            });
        }

        console.error('Search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to search products',
        });
    }
});
export default router;