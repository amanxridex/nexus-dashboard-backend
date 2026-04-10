const jwt = require('jsonwebtoken');

const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const expectedUser = process.env.ADMIN_USERNAME;
        const expectedPass = process.env.ADMIN_PASSWORD;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        if (username === expectedUser && password === expectedPass) {
            // Generate JWT
            const token = jwt.sign(
                { role: 'super_admin', username },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.status(200).json({ success: true, token, message: 'Authentication successful' });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Intrusion alert logged.' });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        return res.status(500).json({ success: false, message: 'Internal Authentication Error' });
    }
};

module.exports = { loginAdmin };
