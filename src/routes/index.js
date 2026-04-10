const express = require('express');
const router = express.Router();

const { getDashboardStats, getRecentActivity, getTopFests } = require('../controllers/dashboardController');
const { getFests, updateFestStatus } = require('../controllers/adminFestController');
const { getUsers, getHosts, updateHostVerification } = require('../controllers/adminUserController');
const { getBookings } = require('../controllers/adminBookingController');
const { getPayments } = require('../controllers/adminPaymentController');
const { getColleges, addCollege, updateCollege, deleteCollege } = require('../controllers/adminCollegeController');
const { getAnalytics } = require('../controllers/adminAnalyticsController');
const { sendAdminNotification, getNotificationHistory, getBroadcastDetails } = require('../controllers/adminNotificationController');

// Health Check
router.get('/health', (req, res) => {
    res.json({ message: 'API is healthy' });
});

// Dashboard Modules
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/feed', getRecentActivity);
router.get('/dashboard/top-fests', getTopFests);

// Admin - Fests
router.get('/admin/fests', getFests);
router.put('/admin/fests/:id/status', updateFestStatus);

// Admin - Users & Hosts
router.get('/admin/users', getUsers);
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
router.get('/admin/analytics', getAnalytics);

// Admin - Notifications
router.post('/admin/notifications/send', sendAdminNotification);
router.get('/admin/notifications/history', getNotificationHistory);
router.get('/admin/notifications/broadcast-details/:id', getBroadcastDetails);

module.exports = router;
