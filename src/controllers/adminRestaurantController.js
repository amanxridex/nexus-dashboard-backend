const { hostDb } = require('../config/supabase');

exports.getRestaurants = async (req, res) => {
    try {
        const { data, error } = await hostDb
            .from('restaurants')
            .select(`
                *,
                hosts (full_name, email, phone)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'active', 'published', 'rejected', 'reject_update'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status schema' });
        }
        
        // Fetch current row physically
        const { data: currentRest, error: fetchErr } = await hostDb.from('restaurants').select('*').eq('id', id).single();
        if (fetchErr || !currentRest) throw fetchErr || new Error("Restaurant not found mapping.");

        let targetStatus = status === 'published' ? 'active' : status;
        let updates = { status: targetStatus };

        if (status === 'reject_update') {
            updates = { status: 'active', pending_changes: null };
        } else if (targetStatus === 'active' && currentRest.pending_changes) {
            updates = { ...updates, ...currentRest.pending_changes, pending_changes: null };
        }

        const { data, error } = await hostDb
            .from('restaurants')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: `Structural restaurant status upgraded to ${targetStatus}`,
            data: data[0]
        });
    } catch (error) {
        console.error('Error updating restaurant status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
