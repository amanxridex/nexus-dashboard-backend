const { admin } = require('../config/firebase');
const { userDb, hostDb } = require('../config/supabase');

exports.sendAdminNotification = async (req, res, next) => {
    try {
        const { targetAudience, specificUid, title, body, type = 'system' } = req.body;

        if (!title || !body || !targetAudience) {
            return res.status(400).json({ success: false, message: 'Title, body, and target audience required' });
        }

        let tokens = [];
        let dbInsertions = [];

        // Determine which database to query based on audience type
        // Wait, 'specific' could be a user or host. We'll check user first, then host.
        
        if (targetAudience === 'users') {
            const { data } = await userDb.from('users').select('firebase_uid, fcm_token').not('firebase_uid', 'is', null);
            if (data) {
                data.forEach(u => {
                    dbInsertions.push({ firebase_uid: u.firebase_uid, title, body, type });
                    if (u.fcm_token) tokens.push(u.fcm_token);
                });
            }
            if (dbInsertions.length > 0) {
                await userDb.from('notifications').insert(dbInsertions);
            }
        } 
        else if (targetAudience === 'hosts') {
            const { data } = await hostDb.from('hosts').select('firebase_uid, fcm_token').not('firebase_uid', 'is', null);
            if (data) {
                data.forEach(h => {
                    dbInsertions.push({ firebase_uid: h.firebase_uid, title, body, type });
                    if (h.fcm_token) tokens.push(h.fcm_token);
                });
            }
            if (dbInsertions.length > 0) {
                await hostDb.from('notifications').insert(dbInsertions);
            }
        }
        else if (targetAudience === 'specific') {
            if (!specificUid) return res.status(400).json({ success: false, message: 'Specific UID required' });
            
            // Try user db first
            let { data: user } = await userDb.from('users').select('firebase_uid, fcm_token').eq('firebase_uid', specificUid).single();
            if (user) {
                await userDb.from('notifications').insert([{ firebase_uid: user.firebase_uid, title, body, type }]);
                if (user.fcm_token) tokens.push(user.fcm_token);
            } else {
                // Try host db
                let { data: host } = await hostDb.from('hosts').select('firebase_uid, fcm_token').eq('firebase_uid', specificUid).single();
                if (host) {
                    await hostDb.from('notifications').insert([{ firebase_uid: host.firebase_uid, title, body, type }]);
                    if (host.fcm_token) tokens.push(host.fcm_token);
                } else {
                    return res.status(404).json({ success: false, message: 'User/Host UID not found' });
                }
            }
        }

        // Send Push Notifications
        let pushResult = { successCount: 0, failureCount: 0 };
        if (tokens.length > 0) {
            // Firebase limits to 500 tokens per Multicast
            const chunkSize = 500;
            for (let i = 0; i < tokens.length; i += chunkSize) {
                const chunk = tokens.slice(i, i + chunkSize);
                const message = {
                    notification: { title, body },
                    data: { type },
                    tokens: chunk,
                };
                try {
                    const response = await admin.messaging().sendEachForMulticast(message);
                    pushResult.successCount += response.successCount;
                    pushResult.failureCount += response.failureCount;
                } catch (e) {
                    console.error('FCM Multicast Error:', e);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Notification sent successfully to ${dbInsertions.length || 1} recipients.`,
            pushResult
        });

    } catch (error) {
        console.error('Error sending admin notification:', error);
        next(error);
    }
};
