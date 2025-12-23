import Router from 'express';
import { getProductById, getProducts, postProduct, searchProducts } from '../controllers/ProductController.js';
import { DuplicateProductError, NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../error/errorHandler.js';
import { generateProductDescription, generateProductSKU, generateVariantSKU } from '../services/GenerateService.js';
import { getAdminProducts, updateProductStatus } from '../controllers/ProductController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';
import { Role } from '../types/authTypes.js';

const router = Router();

router.post('/generate-description', async (req, res) => {
    try {
        const { name, category, variants, basePrice, discountedPrice } = req.body;

        if (!name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Name and category are required',
            });
        }

        const description = await generateProductDescription({
            name,
            category,
            variants,
            basePrice,
            discountedPrice,
        });

        return res.status(200).json({
            success: true,
            description,
        });
    } catch (error) {
        console.error('Description generation error:', error);

        if (error instanceof Error && error.message.includes('HF_TOKEN')) {
            return res.status(500).json({
                success: false,
                message: 'AI service not configured. Please contact administrator.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to generate description',
        });
    }
});

router.post('/generate-sku', async (req, res) => {
    try {
        const { category, variants } = req.body;

        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required',
            });
        }

        const sku = await generateProductSKU({ category, variants });

        return res.status(200).json({
            success: true,
            sku,
        });
    } catch (error) {
        console.error('SKU generation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate SKU',
        });
    }
});

router.post('/generate-variant-sku', async (req, res) => {
    try {
        const { baseSKU, variantName } = req.body;

        if (!baseSKU || !variantName) {
            return res.status(400).json({
                success: false,
                message: 'baseSKU and variantName are required',
            });
        }

        const sku = await generateVariantSKU({ baseSKU, variantName });

        return res.status(200).json({
            success: true,
            sku,
        });
    } catch (error) {
        console.error('Variant SKU generation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate variant SKU',
        });
    }
});

router.get('/admin', authenticate, authorize([Role.ADMIN]), async (req: any, res) => {
    try {
        const { status, limit, offset } = req.query;
        const result = await getAdminProducts({
            ...(status && { status: status as string }),
            ...(limit && { limit: parseInt(limit as string) }),
            ...(offset && { offset: parseInt(offset as string) })
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Admin products error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
});

router.patch('/admin/:id/status', authenticate, authorize([Role.ADMIN]), async (req: any, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        const product = await updateProductStatus(id, status);
        res.json({ success: true, product });
    } catch (error: any) {
        console.error('Update product status error:', error);
        if (error.message?.includes('Invalid')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        if (error.message?.includes('not found')) {
            return res.status(404).json({ success: false, error: 'Product not found' });
        }
        res.status(500).json({ success: false, error: 'Failed to update product status' });
    }
});

router.post('/post-product', authenticate, async (req: any, res) => {
    try {
        const product = await postProduct(req.body, req.user);

        res.status(201).json({
            success: true,
            message: "Product posted successfully.",
            data: product
        });
    } catch (error) {
        console.error("Route error:", error);

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                issues: error.issues
            });
        }

        if (error instanceof DuplicateProductError) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }

        if (error instanceof Error && error.message.includes("Seller profile not found")) {
            return res.status(403).json({ success: false, error: error.message });
        }

        if (error instanceof Error && error.message.includes("limit reached")) {
            return res.status(403).json({ success: false, error: error.message });
        }

        // Handle error from seller status check
        if (error instanceof Error && (error.message.includes("suspended") || error.message.includes("banned"))) {
            return res.status(403).json({ success: false, error: error.message });
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as any;
            if (prismaError.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: "A product with this unique field already exists"
                });
            }
        }

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

        // searchTerm can be empty string for suggested products
        if (searchTerm !== undefined && typeof searchTerm !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'searchTerm query parameter must be a string.',
            });
        }

        const parsedLimit = limit ? parseInt(limit as string) : 20;

        const products = await searchProducts(searchTerm as string || '', parsedLimit);

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

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await getProductById(id);

        return res.status(200).json({
            success: true,
            product: product,
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        if (error instanceof ValidationError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid product ID',
            });
        }

        console.error('Get product error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
        });
    }
});

router.put('/:id', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        // console.log("Updating product:", id, req.body);
        const product = await import('../controllers/ProductController.js').then(m => m.updateProduct(id, req.body, req.user));

        return res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (error) {
        console.error("Update error:", error);

        if (error instanceof NotFoundError) {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error instanceof ValidationError) {
            return res.status(400).json({ success: false, error: "Validation failed", issues: error.issues });
        }

        if (error instanceof ForbiddenError) {
            return res.status(403).json({ success: false, error: error.message });
        }

        if (error instanceof ConflictError) {
            return res.status(409).json({ success: false, error: error.message });
        }

        if (error && (error as any).code === 'P2002') {
            return res.status(409).json({ success: false, error: "Duplicate field (likely SKU) found." });
        }

        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal error" });
    }
});

router.delete('/:id', authenticate, async (req: any, res) => {
    try {
        const { id } = req.params;
        await import('../controllers/ProductController.js').then(m => m.deleteProduct(id, req.user));

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error("Delete error:", error);

        if (error instanceof NotFoundError) {
            return res.status(404).json({ success: false, message: error.message });
        }

        if (error instanceof ForbiddenError) {
            return res.status(403).json({ success: false, error: error.message });
        }

        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Internal error" });
    }
});

export default router;