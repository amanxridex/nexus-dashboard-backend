const { userDb, hostDb } = require('../config/supabase');

const getAnalytics = async (req, res) => {
    try {
        // Fetch users grouped by created date (last 30 days)
        const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: users, error: uErr } = await userDb.from('users')
            .select('created_at')
            .gte('created_at', THIRTY_DAYS_AGO);

        const { data: bookings, error: bErr } = await userDb.from('bookings')
            .select('created_at, total_amount')
            .gte('created_at', THIRTY_DAYS_AGO);

        if (uErr || bErr) {
            console.error('Analytics Fetch error:', { uErr, bErr });
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        }

        // Group by Date for Users
        const userGrowth = {};
        users.forEach(u => {
            const date = u.created_at.split('T')[0];
            userGrowth[date] = (userGrowth[date] || 0) + 1;
        });

        // Group Revenue by Date
        const revenueGrowth = {};
        bookings.forEach(b => {
            const date = b.created_at.split('T')[0];
            revenueGrowth[date] = (revenueGrowth[date] || 0) + (parseFloat(b.total_amount) || 0);
        });

        // Generate Labels (Past 30 Days)
        const labels = [];
        const userSeries = [];
        const revenueSeries = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            labels.push(date);
            userSeries.push(userGrowth[date] || 0);
            revenueSeries.push(revenueGrowth[date] || 0);
        }

        res.json({
            analytics: {
                labels,
                users: userSeries,
                revenue: revenueSeries
            }
        });
    } catch (err) {
        console.error('getAnalytics error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getAnalytics
};
