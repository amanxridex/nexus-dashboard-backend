const { admin, userAdmin } = require('../config/firebase');
const { userDb, hostDb } = require('../config/supabase');

exports.sendAdminNotification = async (req, res, next) => {
    try {
        const { targetAudience, specificUid, title, body, type = 'system' } = req.body;

        if (!title || !body || !targetAudience) {
            return res.status(400).json({ success: false, message: 'Title, body, and target audience required' });
        }

        let tokens = [];
        let dbInsertions = [];
        let pushResult = { successCount: 0, failureCount: 0 };

        const sendFCM = async (messageTokens, adminInstance) => {
            if (!adminInstance) {
                console.warn("Firebase admin instance not provided for this environment. Push failed.");
                pushResult.failureCount += messageTokens.length;
                return;
            }
            if (messageTokens.length === 0) return;
            const chunkSize = 500;
            for (let i = 0; i < messageTokens.length; i += chunkSize) {
                const chunk = messageTokens.slice(i, i + chunkSize);
                const message = {
                    notification: { title, body },
                    webpush: {
                        notification: {
                            icon: 'https://reseat.vercel.app/assets/logo.png', // Main Nexus app logo
                            badge: 'https://reseat.vercel.app/assets/logo.png'
                        }
                    },
                    data: { type },
                    tokens: chunk,
                };
                try {
                    const response = await adminInstance.messaging().sendEachForMulticast(message);
                    pushResult.successCount += response.successCount;
                    pushResult.failureCount += response.failureCount;
                    if (response.failureCount > 0) {
                        response.responses.forEach((resp) => {
                            if (!resp.success) console.error("Failed token err:", resp.error);
                        });
                    }
                } catch (e) {
                    console.error('FCM Multicast Error:', e);
                }
            }
        };

        if (targetAudience === 'users') {
            const { data } = await userDb.from('users').select('firebase_uid, fcm_token').not('firebase_uid', 'is', null);
            if (data) {
                data.forEach(u => {
                    dbInsertions.push({ firebase_uid: u.firebase_uid, title, body, type });
                    if (u.fcm_token) tokens.push(u.fcm_token);
                });
            }
            if (dbInsertions.length > 0) await userDb.from('notifications').insert(dbInsertions);
            await sendFCM(tokens, userAdmin);
        } 
        else if (targetAudience === 'hosts') {
            const { data } = await hostDb.from('hosts').select('firebase_uid, fcm_token').not('firebase_uid', 'is', null);
            if (data) {
                data.forEach(h => {
                    dbInsertions.push({ firebase_uid: h.firebase_uid, title, body, type });
                    if (h.fcm_token) tokens.push(h.fcm_token);
                });
            }
            if (dbInsertions.length > 0) await hostDb.from('notifications').insert(dbInsertions);
            await sendFCM(tokens, admin); // Default admin is host
        }
        else if (targetAudience === 'specific') {
            if (!specificUid) return res.status(400).json({ success: false, message: 'Specific UID required' });
            
            // Try user db first
            let { data: user } = await userDb.from('users').select('firebase_uid, fcm_token').eq('firebase_uid', specificUid).single();
            if (user) {
                await userDb.from('notifications').insert([{ firebase_uid: user.firebase_uid, title, body, type }]);
                if (user.fcm_token) tokens.push(user.fcm_token);
                await sendFCM(tokens, userAdmin);
            } else {
                // Try host db
                let { data: host } = await hostDb.from('hosts').select('firebase_uid, fcm_token').eq('firebase_uid', specificUid).single();
                if (host) {
                    await hostDb.from('notifications').insert([{ firebase_uid: host.firebase_uid, title, body, type }]);
                    if (host.fcm_token) tokens.push(host.fcm_token);
                    await sendFCM(tokens, admin);
                } else {
                    return res.status(404).json({ success: false, message: 'User/Host UID not found' });
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Notification sent successfully to ${dbInsertions.length || 1} recipients. (Pushed: ${pushResult.successCount} success, ${pushResult.failureCount} failed)`,
            pushResult
        });

    } catch (error) {
        console.error('Error sending admin notification:', error);
        next(error);
    }
};

exports.getNotificationHistory = async (req, res, next) => {
    try {
        // Fetch from both databases
        const { data: userNotifs, error: userErr } = await userDb.from('notifications')
            .select('id, title, body, type, is_read, created_at, firebase_uid, target:firebase_uid')
            .order('created_at', { ascending: false })
            .limit(200);

        const { data: hostNotifs, error: hostErr } = await hostDb.from('notifications')
            .select('id, title, body, type, is_read, created_at, firebase_uid, target:firebase_uid')
            .order('created_at', { ascending: false })
            .limit(200);

        if (userErr && !userNotifs) console.error("User notices fetch err", userErr);
        if (hostErr && !hostNotifs) console.error("Host notices fetch err", hostErr);

        let combined = [];
        if (userNotifs) combined.push(...userNotifs.map(n => ({ ...n, audience: 'User' })));
        if (hostNotifs) combined.push(...hostNotifs.map(n => ({ ...n, audience: 'Host' })));

        // Sort combined array by created_at DESC first so newest determines the group stamp
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Group together broadcasts so the Admin doesn't get spammed by 50 rows of the same message
        let historyMeta = {};
        combined.forEach(n => {
            const key = n.title + '|' + n.body + '|' + n.audience;
            if (!historyMeta[key]) {
                const broadcast_id = Buffer.from(key).toString('base64');
                historyMeta[key] = { ...n, count: 1, broadcast_id };
            } else {
                historyMeta[key].count += 1;
            }
        });

        let deduplicated = Object.values(historyMeta).map(n => {
            if (n.count > 1) {
                n.target = `Broadcast (${n.count} recipients)`;
            }
            return n;
        });

        return res.status(200).json({
            success: true,
            data: deduplicated.slice(0, 50)
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        next(error);
    }
};

exports.getBroadcastDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Broadcast ID required' });

        const decoded = Buffer.from(id, 'base64').toString('utf8');
        const [title, body, audience] = decoded.split('|');

        if (!title || !body || !audience) return res.status(400).json({ success: false, message: 'Invalid Broadcast ID' });

        const db = audience === 'Host' ? hostDb : userDb;
        const tableName = audience === 'Host' ? 'hosts' : 'users';

        // 1. Fetch all firebase_uids that received this exact broadcast from notifications table
        const { data: notifs, error: notifErr } = await db.from('notifications')
            .select('firebase_uid, created_at')
            .eq('title', title)
            .eq('body', body);

        if (notifErr || !notifs || notifs.length === 0) {
            return res.status(404).json({ success: false, message: 'No recipients found for this broadcast' });
        }

        const uids = notifs.map(n => n.firebase_uid).filter(Boolean);

        // 2. Fetch the actual user details of those recipients
        const { data: usersInfo, error: userErr } = await db.from(tableName)
            .select('firebase_uid, full_name, email, phone, fcm_token')
            .in('firebase_uid', uids);

        if (userErr) {
            console.error('Error fetching recipient details:', userErr);
            return res.status(500).json({ success: false, message: 'Failed to fetch recipient details' });
        }

        // 3. Map details into final array
        let recipientList = notifs.map(n => {
            const u = usersInfo?.find(u => u.firebase_uid === n.firebase_uid) || {};
            return {
                firebase_uid: n.firebase_uid,
                sent_at: n.created_at,
                full_name: u.full_name || 'N/A',
                email: u.email || 'N/A',
                phone: u.phone || 'N/A',
                fcm_token: u.fcm_token || 'N/A'
            };
        });

        // 4. Safely filter out anyone who doesn't actually have an FCM token (meaning they never received the physical push)
        recipientList = recipientList.filter(r => r.fcm_token !== 'N/A' && r.fcm_token);

        return res.status(200).json({
            success: true,
            title,
            body,
            audience,
            recipients: recipientList
        });

    } catch (error) {
        console.error('Error fetching broadcast details:', error);
        next(error);
    }
};
