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

const getRecentActivity = async (req, res) => {
    try {
        // Fetch recent bookings
        const { data: bookings } = await userDb.from('bookings').select('id, attendee_name, total_amount, created_at').order('created_at', { ascending: false }).limit(5);
        // Fetch recent users
        const { data: users } = await userDb.from('users').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5);
        
        let activities = [];
        
        if (bookings) {
            bookings.forEach(b => activities.push({
                type: 'booking',
                title: 'New booking by ' + (b.attendee_name || 'Unknown'),
                time: b.created_at,
                value: '₹' + (b.total_amount || 0)
            }));
        }
        
        if (users) {
            users.forEach(u => activities.push({
                type: 'user',
                title: 'New user registered: ' + (u.full_name || 'Unknown'),
                time: u.created_at,
                value: null
            }));
        }
        
        // Sort combined
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        res.json({ activities: activities.slice(0, 5) });
    } catch (err) {
        console.error('getRecentActivity error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getTopFests = async (req, res) => {
    try {
        // Fetch top 5 fests by revenue
        const { data: analytics, error } = await hostDb.from('fest_analytics')
            .select('fest_id, total_revenue, total_tickets_sold')
            .order('total_revenue', { ascending: false })
            .limit(5);

        if (error || !analytics || analytics.length === 0) {
            return res.json({ topFests: [] });
        }

        const festIds = analytics.map(a => a.fest_id);
        const { data: fests } = await hostDb.from('fests')
            .select('id, fest_name, host_id')
            .in('id', festIds);

        // Fetch colleges for these hosts
        const hostIds = fests.map(f => f.host_id).filter(Boolean);
        let hosts = [];
        if (hostIds.length > 0) {
            const { data: hData } = await hostDb.from('hosts').select('id, college_name').in('id', hostIds);
            hosts = hData || [];
        }

        const topFests = analytics.map((a, index) => {
            const fest = fests.find(f => f.id === a.fest_id) || {};
            const host = hosts.find(h => h.id === fest.host_id) || {};
            return {
                rank: index + 1,
                name: fest.fest_name || 'Unknown Fest',
                college: host.college_name || 'Unknown College',
                revenue: '₹' + (a.total_revenue || 0).toLocaleString(),
                bookings: a.total_tickets_sold || 0
            };
        });

        res.json({ topFests });
    } catch (err) {
        console.error('getTopFests error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivity,
    getTopFests
};
