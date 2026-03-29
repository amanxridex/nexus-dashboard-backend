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

module.exports = { getUsers, getHosts, updateHostVerification };
