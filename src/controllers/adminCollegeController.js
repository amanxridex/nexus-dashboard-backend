const { hostDb } = require('../config/supabase');

const getColleges = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { data: colleges, error } = await hostDb
            .from('colleges')
            .select(`
                id,
                name,
                campus,
                location,
                image_url
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('Fetch colleges error:', error);
            return res.status(500).json({ error: 'Failed to fetch colleges' });
        }

        res.json({ colleges: colleges || [] });
    } catch (err) {
        console.error('getColleges error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getColleges
};
