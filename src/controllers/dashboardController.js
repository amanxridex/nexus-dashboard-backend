const { userDb, hostDb } = require('../config/supabase');

const getDashboardStats = async (req, res) => {
    try {
        if (!userDb || !hostDb) {
            return res.status(500).json({ error: 'Database connections not initialized' });
        }

        // Parallel requests to get total counts
        const [
            { count: totalUsers, error: usersError },
            { count: totalHosts, error: hostsError },
            { count: totalFests, error: festsError },
            { count: totalBookings, error: bookingsError },
            { data: revenueData, error: revenueError }
        ] = await Promise.all([
            userDb.from('users').select('*', { count: 'exact', head: true }),
            hostDb.from('hosts').select('*', { count: 'exact', head: true }),
            hostDb.from('fests').select('*', { count: 'exact', head: true }),
            userDb.from('bookings').select('*', { count: 'exact', head: true }),
            hostDb.from('fest_analytics').select('total_revenue')
        ]);

        if (usersError || hostsError || festsError || bookingsError || revenueError) {
             console.error("Errors:", {usersError, hostsError, festsError, bookingsError, revenueError});
             return res.status(500).json({ error: 'Failed to fetch aggregate metrics' });
        }

        const totalRevenue = revenueData.reduce((acc, curr) => acc + (parseFloat(curr.total_revenue) || 0), 0);

        res.json({
            stats: {
                totalUsers: totalUsers || 0,
                totalHosts: totalHosts || 0,
                totalFests: totalFests || 0,
                totalBookings: totalBookings || 0,
                totalRevenue: totalRevenue || 0
            }
        });
    } catch (err) {
        console.error('getDashboardStats error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getDashboardStats
};
