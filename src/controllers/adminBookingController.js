const { userDb } = require('../config/supabase');

const getBookings = async (req, res) => {
    try {
        if (!userDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { data: bookings, error } = await userDb
            .from('bookings')
            .select(`
                id,
                created_at,
                event_name,
                college_name,
                attendee_name,
                attendee_email,
                ticket_quantity,
                total_amount,
                payment_status
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch bookings error:', error);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }

        res.json({ bookings: bookings || [] });
    } catch (err) {
        console.error('getBookings error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getBookings
};
