const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Phase 1: Pure IP Firewall validation
    if (process.env.ADMIN_IP && process.env.ADMIN_IP !== '*') {
        const allowedIps = process.env.ADMIN_IP.split(',').map(ip => ip.trim());
        // Using req.ip (trust proxy must be configured on express later if behind LB)
        const requestIp = req.ip || req.connection.remoteAddress;
        
        if (!allowedIps.includes(requestIp)) {
            console.error(`MILITARY FIREWALL DROPPED UNAUTHORIZED IP: ${requestIp}`);
            return res.status(403).json({ success: false, message: 'Forbidden: IP address not whitelisted.' });
        }
    }

    // Phase 2: Token Verification (Exempt login, refresh and health routes)
    if (req.path === '/admin/auth/login' || req.path === '/health' || req.path === '/admin/auth/refresh') {
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
