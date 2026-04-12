

// Hardcoded target lists to restrict scope securely.
const VERCEL_TARGETS = [
    { id: 'prj_nbysZ1Waar7TKeCqGgeGm6eiIO0y', name: 'Nexus Host Portal', platform: 'Vercel' },
    { id: 'prj_LdvvYr5MoJuOrsDDwAsUyulU2hJ8', name: 'Nexus User App', platform: 'Vercel' },
    { id: 'prj_ZbVAV3XivZa9d2OdrTq2kf1rFMOn', name: 'Nexus Admin Dashboard', platform: 'Vercel' }
];

const RENDER_TARGETS = [
    { id: 'srv-d652oqrqhjbs738s3jn0', name: 'Host Backend Engine', platform: 'Render' },
    { id: 'srv-d63gbnchg0os73cfit5g', name: 'User App Engine (API)', platform: 'Render' },
    { id: 'srv-d74pfr7pm1nc739350ig', name: 'Admin Database Layer', platform: 'Render' }
];

exports.getAvailableLogProjects = async (req, res) => {
    try {
        const projects = [...VERCEL_TARGETS, ...RENDER_TARGETS];
        res.json({ success: true, projects });
    } catch (err) {
        console.error('Error fetching log projects:', err);
        res.status(500).json({ success: false, message: 'Failed to retrieve available logging projects.' });
    }
};

exports.fetchProjectLogs = async (req, res) => {
    const { projectId, platform } = req.query;

    if (!projectId || !platform) {
        return res.status(400).json({ success: false, message: 'Missing projectId or platform.' });
    }

    try {
        if (platform === 'Vercel') {
            const isValid = VERCEL_TARGETS.some(t => t.id === projectId);
            if (!isValid) return res.status(403).json({ success: false, message: 'Unauthorized project requested.' });

            // Fetch Vercel Edge/Deployment Logs
            const response = await fetch(`https://api.vercel.com/v3/events?projectId=${projectId}&limit=50`, {
                headers: { 'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}` }
            });
            const data = await response.json();
            
            // Normalize
            const logs = (data.events || []).map(event => ({
                id: event.id,
                timestamp: new Date(event.created).toISOString(),
                message: event.text || event.message || JSON.stringify(event.payload || {}),
                level: event.type === 'error' ? 'error' : (event.type === 'warning' ? 'warning' : 'info'),
                source: event.source || 'edge'
            }));

            return res.json({ success: true, logs });
            
        } else if (platform === 'Render') {
            const isValid = RENDER_TARGETS.some(t => t.id === projectId);
            if (!isValid) return res.status(403).json({ success: false, message: 'Unauthorized service requested.' });

            // Fetch Render Service Logs
            const response = await fetch(`https://api.render.com/v1/services/${projectId}/logs?limit=50`, {
                headers: { 
                    'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
                    'Accept': 'application/json' 
                }
            });
            const data = await response.json();

            // Normalize
            const logs = (data || []).map(log => {
                let msg = log.log || '';
                let level = 'info';
                if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('exception')) {
                    level = 'error';
                } else if (msg.toLowerCase().includes('warn')) {
                    level = 'warning';
                }
                
                return {
                    id: log.id || Math.random().toString(36).substring(7),
                    timestamp: log.timestamp || new Date().toISOString(),
                    message: msg.trim(),
                    level: level,
                    source: 'container'
                };
            });

            // Reorder Render logs (they might be older first depending on api, we want newest first)
            logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

            return res.json({ success: true, logs });

        } else {
            return res.status(400).json({ success: false, message: 'Invalid platform specified.' });
        }
    } catch (err) {
        console.error(`Error fetching logs for ${platform}:`, err);
        res.status(500).json({ success: false, message: 'Failed to contact external logging driver.' });
    }
};
