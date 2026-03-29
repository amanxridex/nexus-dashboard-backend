const express = require('express');
const router = express.Router();

const { getDashboardStats } = require('../controllers/dashboardController');
const { getFests, updateFestStatus } = require('../controllers/adminFestController');
const { getUsers, getHosts, updateHostVerification } = require('../controllers/adminUserController');

// Health Check
router.get('/health', (req, res) => {
    res.json({ message: 'API is healthy' });
});

// Dashboard Stats
router.get('/dashboard/stats', getDashboardStats);

// Admin - Fests
router.get('/admin/fests', getFests);
router.put('/admin/fests/:id/status', updateFestStatus);

// Admin - Users & Hosts
router.get('/admin/users', getUsers);
router.get('/admin/hosts', getHosts);
router.put('/admin/hosts/:id/verification', updateHostVerification);

module.exports = router;
