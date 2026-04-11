const supabase = require('../config/supabase');

// Get all properties
exports.getProperties = async (req, res) => {
    try {
        const { data, error, count } = await supabase
            .from('properties')
            .select(`
                *,
                hosts ( business_name, city, user_name, phone_number, avatar_url )
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
        console.error("Error fetching properties:", err.message);
        res.status(500).json({ success: false, message: "Server error fetching properties" });
    }
};

// Update property status
exports.updatePropertyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const { data, error } = await supabase
            .from('properties')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) {
            return res.status(400).json({ success: false, message: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Property not found" });
        }

        res.status(200).json({
            success: true,
            message: `Property status updated to ${status}`,
            data: data[0]
        });
    } catch (err) {
        console.error("Error updating property status:", err.message);
        res.status(500).json({ success: false, message: "Server error updating property status" });
    }
};
