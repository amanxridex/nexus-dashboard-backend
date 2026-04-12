

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

const TELEMETRY_TARGET = {
    id: 'client-devices',
    name: '🔴 Live Client Devices (Crash Reports)',
    platform: 'Client'
};

exports.getAvailableLogProjects = async (req, res) => {
    try {
        const projects = [...VERCEL_TARGETS, ...RENDER_TARGETS, TELEMETRY_TARGET];
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

            // Fetch Render Deployment Telemetry (Since raw console stdout requires Datadog Log Drains)
            const response = await fetch(`https://api.render.com/v1/services/${projectId}/deploys?limit=25`, {
                headers: { 
                    'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
                    'Accept': 'application/json' 
                }
            });
            const data = await response.json();

            // Normalize telemetry blocks into system logs
            const logs = [];
            (data || []).forEach(block => {
                const dep = block.deploy;
                if (!dep) return;
                
                let level = 'info';
                if (dep.status === 'update_failed' || dep.status === 'build_failed' || dep.status === 'pre_deploy_failed') {
                    level = 'error';
                } else if (dep.status === 'canceled') {
                    level = 'warning';
                }

                // Inject Deployment Status
                logs.push({
                    id: dep.id,
                    timestamp: dep.updatedAt || dep.createdAt,
                    message: `System Deployment Action: [${dep.status.toUpperCase()}] triggered by '${dep.trigger}'`,
                    level: level,
                    source: 'render-orchestrator'
                });

                // Inject Commit details
                if (dep.commit) {
                    logs.push({
                        id: dep.id + '-commit',
                        timestamp: dep.createdAt,
                        message: `Commit Payload: ${dep.commit.message}`,
                        level: 'info',
                        source: 'github-bridge'
                    });
                }
            });

            // Ensure chronological ordering for terminal
            logs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

            return res.json({ success: true, logs });

        } else if (platform === 'Client') {
            const { getClientTelemetryLogs } = require('./telemetryController');
            return getClientTelemetryLogs(req, res);
            
        } else {
            return res.status(400).json({ success: false, message: 'Invalid platform specified.' });
        }
    } catch (err) {
        console.error(`Error fetching logs for ${platform}:`, err);
        res.status(500).json({ success: false, message: 'Failed to contact external logging driver.' });
    }
};
