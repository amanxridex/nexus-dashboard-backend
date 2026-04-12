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

        if (!['pending', 'published', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const { data, error } = await hostDb
            .from('restaurants')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: `Restaurant status updated to ${status}`,
            data: data[0]
        });
    } catch (error) {
        console.error('Error updating restaurant status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
