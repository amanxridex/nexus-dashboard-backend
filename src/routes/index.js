const express = require('express');
const router = express.Router();

const { getDashboardStats, getRecentActivity, getTopFests } = require('../controllers/dashboardController');
const { getFests, updateFestStatus } = require('../controllers/adminFestController');
const { getUsers, getHosts, updateHostVerification, getUserAnalytics } = require('../controllers/adminUserController');
const { getBookings } = require('../controllers/adminBookingController');
const { getPayments } = require('../controllers/adminPaymentController');
const { getColleges, addCollege, updateCollege, deleteCollege } = require('../controllers/adminCollegeController');
const { getAnalytics } = require('../controllers/adminAnalyticsController');
const { sendAdminNotification, getNotificationHistory, getBroadcastDetails } = require('../controllers/adminNotificationController');
const { getProperties, updatePropertyStatus } = require('../controllers/adminPropertyController');
const { getGyms, updateGymStatus } = require('../controllers/adminGymController');
const { loginAdmin, refreshAdmin } = require('../controllers/adminAuthController');
const { verifyToken } = require('../middlewares/authMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const rateLimit = require('express-rate-limit');

// Strict Rate Limiting for Login Auth (Max 5 guesses per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5,
    message: { success: false, message: 'Too many login attempts. Your IP has been temporarily blocked.' }
});

// Health Check
router.get('/health', (req, res) => {
    res.json({ message: 'API is healthy' });
});

// Admin Auth
router.post('/admin/auth/login', loginLimiter, loginAdmin);
router.post('/admin/auth/refresh', refreshAdmin);

// === APPLY GLOBAL JWT SECURITY VAULT TO ALL ROUTES BELOW ===
router.use(verifyToken);

// Dashboard Modules
router.get('/dashboard/stats', cacheMiddleware({ EX: 60 }), getDashboardStats); // Cache stats for 1 minute
router.get('/dashboard/feed', cacheMiddleware({ EX: 60 }), getRecentActivity);
router.get('/dashboard/top-fests', cacheMiddleware({ EX: 120 }), getTopFests);

// Admin - Fests
router.get('/admin/fests', getFests);
router.put('/admin/fests/:id/status', updateFestStatus);

// Admin - Properties
router.get('/admin/properties', getProperties);
router.patch('/admin/properties/:id/status', updatePropertyStatus);

// Admin - Gyms
router.get('/admin/gyms', getGyms);
router.patch('/admin/gyms/:id/status', updateGymStatus);

// Admin - Users & Hosts
router.get('/admin/users', getUsers);
router.get('/admin/users/analytics/:uid', getUserAnalytics);
router.get('/admin/hosts', getHosts);
router.put('/admin/hosts/:id/verification', updateHostVerification);

// Admin - Bookings
router.get('/admin/bookings', getBookings);

// Admin - Payments
router.get('/admin/payments', getPayments);

// Admin - Colleges
router.get('/admin/colleges', getColleges);
router.post('/admin/colleges', addCollege);
router.put('/admin/colleges/:id', updateCollege);
router.delete('/admin/colleges/:id', deleteCollege);

// Admin - Analytics
router.get('/admin/analytics', cacheMiddleware({ EX: 300 }), getAnalytics);

// Admin - Notifications
router.post('/admin/notifications/send', sendAdminNotification);
router.get('/admin/notifications/history', getNotificationHistory);
router.get('/admin/notifications/broadcast-details/:id', getBroadcastDetails);

module.exports = router;
