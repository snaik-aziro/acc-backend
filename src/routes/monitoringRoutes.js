const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');

// GET /api/monitoring/overview - System overview metrics
router.get('/overview', monitoringController.getSystemOverview);

// GET /api/monitoring/vms/:id/metrics - Real-time VM metrics
router.get('/vms/:id/metrics', monitoringController.getVMMetrics);

// GET /api/monitoring/vms/:id/usage - VM usage history
router.get('/vms/:id/usage', monitoringController.getVMUsageHistory);

// GET /api/monitoring/alerts - System alerts and warnings
router.get('/alerts', monitoringController.getAlerts);

// POST /api/monitoring/alerts/:alertId/resolve - Resolve an alert
router.post('/alerts/:alertId/resolve', monitoringController.resolveAlert);

// GET /api/monitoring/health - System health checks
router.get('/health', monitoringController.getHealthChecks);

// GET /api/monitoring/performance - Performance metrics
router.get('/performance', monitoringController.getPerformanceMetrics);

// GET /api/monitoring/dashboard - Dashboard data
router.get('/dashboard', monitoringController.getDashboardData);

module.exports = router;