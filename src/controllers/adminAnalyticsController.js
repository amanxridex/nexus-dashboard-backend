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

        // Fetch ALL users for demographics mapping and live users
        const { data: allUsers, error: auErr } = await userDb.from('users').select('device_info, city, last_active_time, total_session_seconds');
        
        // 1. Live Users (active in last 5 min)
        const FIVE_MINS_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        let liveUsers = 0;
        let totalSessions = 0;
        let validSessionCount = 0;

        // Device Counters
        let iosCount = 0;
        let androidCount = 0;
        let otherDeviceCount = 0;

        // City Counters
        const cityMap = {};

        if (allUsers) {
            allUsers.forEach(u => {
                // Live users check
                if (u.last_active_time && u.last_active_time >= FIVE_MINS_AGO) {
                    liveUsers++;
                }
                
                // Session metrics
                if (u.total_session_seconds) {
                    totalSessions += parseInt(u.total_session_seconds);
                    validSessionCount++;
                }

                // Device Intel
                if (u.device_info) {
                    const device = u.device_info.toLowerCase();
                    if (device.includes('ios') || device.includes('iphone') || device.includes('mac') || device.includes('apple')) iosCount++;
                    else if (device.includes('android')) androidCount++;
                    else otherDeviceCount++;
                } else {
                    otherDeviceCount++;
                }

                // City Map
                if (u.city) {
                    cityMap[u.city] = (cityMap[u.city] || 0) + 1;
                }
            });
        }

        const avgSessionTime = validSessionCount > 0 ? Math.floor(totalSessions / validSessionCount) : 0;

        // Sort Top 5 Cities
        const topCitiesArr = Object.entries(cityMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const totalRevenue30Days = revenueSeries.reduce((a, b) => a + b, 0);

        res.json({
            analytics: {
                labels,
                users: userSeries,
                revenue: revenueSeries,
                liveUsers,
                avgSessionTime,
                totalUsersCount: allUsers ? allUsers.length : 0,
                totalRevenue30Days,
                devices: {
                    labels: ['Android', 'iOS', 'Web/Other'],
                    data: [androidCount, iosCount, otherDeviceCount]
                },
                cities: {
                    labels: topCitiesArr.map(c => c[0]),
                    data: topCitiesArr.map(c => c[1])
                }
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
