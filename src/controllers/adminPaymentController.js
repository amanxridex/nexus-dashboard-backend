const { userDb } = require('../config/supabase');

const getPayments = async (req, res) => {
    try {
        if (!userDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { data: payments, error } = await userDb
            .from('bookings')
            .select(`
                id,
                created_at,
                attendee_name,
                event_name,
                total_amount,
                platform_fee,
                razorpay_order_id,
                razorpay_payment_id,
                payment_status
            `)
            .not('razorpay_order_id', 'is', null) // Only actual transactions
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch payments error:', error);
            return res.status(500).json({ error: 'Failed to fetch payments' });
        }

        res.json({ payments: payments || [] });
    } catch (err) {
        console.error('getPayments error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getPayments
};
