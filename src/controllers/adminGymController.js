const { hostDb } = require('../config/supabase');

// Get all gyms
exports.getGyms = async (req, res) => {
    try {
        const { data, error, count } = await hostDb
            .from('gyms')
            .select(`
                *,
                hosts ( business_name, city, full_name, phone, avatar_url )
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        res.status(200).json({
            success: true,
            totalRows: count,
            data: data
        });
    } catch (err) {
        console.error("Error fetching gyms:", err.message);
        res.status(500).json({ success: false, message: "Server error fetching gyms" });
    }
};

// Update gym status
exports.updateGymStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const { data, error } = await hostDb
            .from('gyms')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Gym not found" });
        }

        res.status(200).json({
            success: true,
            message: `Gym status updated to ${status}`,
            data: data[0]
        });
    } catch (err) {
        console.error("Error updating gym status:", err.message);
        res.status(500).json({ success: false, message: "Server error updating gym status" });
    }
};
