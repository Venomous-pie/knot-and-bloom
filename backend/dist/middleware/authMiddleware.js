import jwt from 'jsonwebtoken';
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
export const optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }
    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) {
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
export const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const user = req.user;
        if (!roles.includes(user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};
export const requireActiveSeller = (req, res, next) => {
    if (!req.user)
        return res.status(401).json({ error: 'Not authenticated' });
    const user = req.user;
    if (user.sellerStatus !== 'ACTIVE') {
        return res.status(403).json({
            error: 'Seller account not active',
            status: user.sellerStatus
        });
    }
    next();
};
//# sourceMappingURL=authMiddleware.js.map