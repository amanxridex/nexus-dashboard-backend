const { userDb, hostDb } = require('../config/supabase');

const getUsers = async (req, res) => {
    try {
        if (!userDb) return res.status(500).json({ error: 'DB connection error' });

        const { data: users, error } = await userDb
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getHosts = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'DB connection error' });

        const { data: hosts, error } = await hostDb
            .from('hosts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ hosts });
    } catch (err) {
         res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateHostVerification = async (req, res) => {
     try {
        if (!hostDb) return res.status(500).json({ error: 'DB connection error' });

        const { id } = req.params;
        const { verification_status } = req.body; 
        
        const validStatuses = ['verified', 'rejected', 'pending'];

        if (!validStatuses.includes(verification_status)) {
             return res.status(400).json({ error: 'Invalid verification status.' });
        }

        const { data: updatedHost, error } = await hostDb
            .from('hosts')
            .update({ verification_status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        
        res.json({ message: 'Host verification updated', host: updatedHost });
     } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
     }
};

const getUserAnalytics = async (req, res) => {
    try {
        const { uid } = req.params;
        if (!uid) return res.status(400).json({ success: false, message: 'UID is required' });

        // 1. Fetch Core Profile & Telemetry
        const { data: user, error: userErr } = await userDb.from('users')
            .select('*')
            .eq('firebase_uid', uid)
            .single();

        if (userErr || !user) {
            return res.status(404).json({ success: false, message: 'User not found in consumer DB' });
        }

        // 2. Fetch Wallet Data
        const { data: wallet } = await userDb.from('wallets')
            .select('*')
            .eq('firebase_uid', uid)
            .single();

        // 3. Fetch Booking History
        const { data: bookings } = await userDb.from('bookings')
            .select('*')
            .eq('firebase_uid', uid)
            .order('created_at', { ascending: false });

        return res.status(200).json({
            success: true,
            data: {
                profile: user,
                wallet: wallet || { balance: 0, currency: 'INR', status: 'Inactive' },
                bookings: bookings || []
            }
        });
    } catch (err) {
        console.error("User Analytics Error:", err);
        return res.status(500).json({ success: false, message: 'Internal Analytics Fault' });
    }
};

module.exports = { getUsers, getHosts, updateHostVerification, getUserAnalytics };
