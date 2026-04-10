const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');

const loginAdmin = async (req, res) => {
    try {
        const { username, password, totp } = req.body;

        const expectedUser = process.env.ADMIN_USERNAME;
        const expectedPass = process.env.ADMIN_PASSWORD;

        if (!username || !password || !totp) {
            return res.status(400).json({ success: false, message: 'Invalid payload: Username, Password, and 2FA Code required' });
        }

        if (username === expectedUser && password === expectedPass) {
            // Verify Google Authenticator 2FA Code
            const verified = speakeasy.totp.verify({
                secret: process.env.ADMIN_2FA_SECRET,
                encoding: 'base32',
                token: totp,
                window: 2 // Allow a 1-minute drift
            });

            if(!verified) {
                return res.status(401).json({ success: false, message: 'Invalid 2FA Code. Intrusion logged.' });
            }

            // Generate Short-lived Access Token (15m)
            const token = jwt.sign(
                { role: 'super_admin', username },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );

            // Generate Long-lived Refresh Token (7d)
            const refreshToken = jwt.sign(
                { role: 'super_admin', refresh: true },
                process.env.JWT_SECRET + "_REFRESH",
                { expiresIn: '7d' }
            );

            return res.status(200).json({ success: true, token, refreshToken, message: 'Authentication successful' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Intrusion alert logged.' });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        return res.status(500).json({ success: false, message: 'Internal Authentication Error' });
    }
};

const refreshAdmin = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET + "_REFRESH");
        if (decoded.role === 'super_admin') {
            const token = jwt.sign(
                { role: 'super_admin', username: process.env.ADMIN_USERNAME },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.status(200).json({ success: true, token });
        } else {
            return res.status(403).json({ success: false, message: 'Bad refresh token payload' });
        }
    } catch(err) {
        return res.status(403).json({ success: false, message: 'Refresh token expired or invalid' });
    }
};

module.exports = { loginAdmin, refreshAdmin };
