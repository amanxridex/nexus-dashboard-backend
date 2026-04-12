const MAX_TELEMETRY_LOGS = 300;
let telemetryBuffer = [];

exports.ingestCrashReport = (req, res) => {
    try {
        const { error, message, stack, url, userAgent, hardware, userId, appName } = req.body;

        // Construct footprint
        const footprint = {
            id: 'crash-' + Date.now() + '-' + Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            message: `[${appName || 'UNKNOWN-APP'}] Client Exception: ${message || error || 'Unknown Error'} | Device: ${hardware} | User: ${userId || 'Anonymous'} | URL: ${url}`,
            level: 'error',
            source: 'client-telemetry',
            rawDump: req.body // for later deep inspections
        };

        // Push to ring buffer (Newest at beginning)
        telemetryBuffer.unshift(footprint);
        
        // Trim to prevent memory saturation
        if (telemetryBuffer.length > MAX_TELEMETRY_LOGS) {
            telemetryBuffer.pop();
        }

        return res.status(200).json({ success: true, message: 'Telemetry packet ingested successfully.' });
    } catch (err) {
        console.error('Failed to ingest telemetry payload:', err);
        return res.status(500).json({ success: false, message: 'Telemetry pipeline fault.' });
    }
};

exports.getClientTelemetryLogs = (req, res) => {
    try {
        // We reverse the array because the frontend logs.js natively expects 
        // to loop through them backwards for "tail" appending. 
        // Wait, logs.js reverses it itself: "for(let i = logsArray.length - 1; i >= 0; i--)"
        // If newest is unshifted (index 0), then logsArray[length-1] is the OLDEST.
        // And it appends the oldest first, newest last. Perfect.
        return res.json({ success: true, logs: telemetryBuffer });
    } catch (err) {
        console.error('Failed to dump telemetry:', err);
        return res.status(500).json({ success: false, message: 'Failed to extract telemetry ring buffer.' });
    }
};
