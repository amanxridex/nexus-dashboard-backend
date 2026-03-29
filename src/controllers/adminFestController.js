const { hostDb } = require('../config/supabase');

const getFests = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'DB connection error' });

        // Fetch all fests from the host database
        const { data: fests, error } = await hostDb
            .from('fests')
            .select(`*, hosts:host_id (full_name, email, college_name)`)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch fests: ' + error.message });
        }
        res.json({ fests });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateFestStatus = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'DB connection error' });

        const { id } = req.params;
        const { status, rejection_reason } = req.body; // status can be 'approved', 'rejected'
        const validStatuses = ['approved', 'rejected'];

        if (!validStatuses.includes(status)) {
             return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
        }

        const updateData = {
           status,
           updated_at: new Date().toISOString()
        };

        if (status === 'approved') {
            updateData.approved_at = new Date().toISOString();
        } else if (status === 'rejected') {
            if (!rejection_reason) return res.status(400).json({ error: 'rejection_reason is required' });
            updateData.rejection_reason = rejection_reason;
        }

        const { data: updatedFest, error } = await hostDb
            .from('fests')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to update fest status: ' + error.message });
        }

        res.json({ message: 'Fest status updated', fest: updatedFest });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { getFests, updateFestStatus };
