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

const addCollege = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { name, campus, location, image_url } = req.body;
        if (!name) return res.status(400).json({ error: 'College name is required' });

        const { data, error } = await hostDb
            .from('colleges')
            .insert([{ name, campus, location, image_url }])
            .select()
            .single();

        if (error) {
            console.error('Add college error:', error);
            return res.status(500).json({ error: 'Failed to add college' });
        }

        res.json({ college: data, message: 'College added successfully' });
    } catch (err) {
        console.error('addCollege error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const updateCollege = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { id } = req.params;
        const { name, campus, location, image_url } = req.body;

        if (!name) return res.status(400).json({ error: 'College name is required' });

        const { data, error } = await hostDb
            .from('colleges')
            .update({ name, campus, location, image_url })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Update college error:', error);
            return res.status(500).json({ error: 'Failed to update college' });
        }

        res.json({ college: data, message: 'College updated successfully' });
    } catch (err) {
        console.error('updateCollege error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const deleteCollege = async (req, res) => {
    try {
        if (!hostDb) return res.status(500).json({ error: 'Database connection not initialized' });

        const { id } = req.params;

        // Try to delete. In reality it might fail if there are fests attached via foreign keys (fests table referencing colleges)
        const { error } = await hostDb
            .from('colleges')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete college error:', error);
            // Check if it's a foreign key violation
            if (error.code === '23503') {
                return res.status(400).json({ error: 'Cannot delete college: It has associated fests or hosts. Please remove them first.' });
            }
            return res.status(500).json({ error: 'Failed to delete college' });
        }

        res.json({ message: 'College deleted successfully' });
    } catch (err) {
        console.error('deleteCollege error:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    getColleges,
    addCollege,
    updateCollege,
    deleteCollege
};
