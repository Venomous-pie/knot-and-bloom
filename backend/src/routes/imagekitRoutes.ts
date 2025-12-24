import express from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY || '';

// @route   GET /api/imagekit/auth
// @desc    Generate authentication parameters for ImageKit client-side upload
router.get('/auth', (req, res) => {
    try {
        if (!IMAGEKIT_PRIVATE_KEY) {
            console.error('ImageKit Auth Error: IMAGEKIT_PRIVATE_KEY is missing');
            return res.status(500).json({
                success: false,
                error: 'ImageKit private key not configured'
            });
        }

        const token = req.query.token as string || uuidv4();
        const expire = req.query.expire as string || String(Math.floor(Date.now() / 1000) + 2400); // 40 minutes

        console.log(`Generating ImageKit signature. Key length: ${IMAGEKIT_PRIVATE_KEY.length}, Token: ${token}, Expire: ${expire}`);

        const signature = crypto
            .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
            .update(token + expire)
            .digest('hex');

        res.status(200).json({
            token,
            expire: parseInt(expire),
            signature,
        });
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate authentication'
        });
    }
});

export default router;
