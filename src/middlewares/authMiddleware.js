const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Exempt login and health routes
    if (req.path === '/admin/auth/login' || req.path === '/health') {
        return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied: Malformed Token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { role: 'admin' }
        next();
    } catch (err) {
        console.error("JWT Verification Failed:", err.message);
        return res.status(401).json({ success: false, message: 'Access Denied: Invalid or Expired Token' });
    }
};

module.exports = { verifyToken };
