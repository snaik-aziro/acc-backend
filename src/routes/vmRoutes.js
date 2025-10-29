const express = require('express');
const router = express.Router();
const vmController = require('../controllers/vmController');
const { Logger, LogCategory } = require('../logging/logger');

// Middleware to log all VM route access for automation testing
router.use((req, res, next) => {
  Logger.logAutomationStep(`VM Route accessed: ${req.method} ${req.originalUrl}`, {
    testCase: req.headers['x-test-case'] || 'manual',
    step: req.headers['x-test-step'] || 'unknown',
    method: req.method,
    path: req.originalUrl,
    body: req.body,
    query: req.query
  });
  next();
});

// GET /api/vms - List all VMs
router.get('/', vmController.getAllVMs);

// POST /api/vms - Create new VM
router.post('/', vmController.createVM);

// GET /api/vms/:id - Get specific VM
router.get('/:id', vmController.getVMById);

// PUT /api/vms/:id - Update VM configuration
router.put('/:id', vmController.updateVM);

// DELETE /api/vms/:id - Delete VM
router.delete('/:id', vmController.deleteVM);

// POST /api/vms/:id/start - Start VM
router.post('/:id/start', vmController.startVM);

// POST /api/vms/:id/stop - Stop VM
router.post('/:id/stop', vmController.stopVM);

// POST /api/vms/:id/restart - Restart VM
router.post('/:id/restart', vmController.restartVM);

// POST /api/vms/:id/snapshot - Create VM snapshot
router.post('/:id/snapshot', vmController.createSnapshot);

// GET /api/vms/:id/snapshots - List VM snapshots
router.get('/:id/snapshots', vmController.getSnapshots);

// POST /api/vms/:id/snapshots/:snapshotId/restore - Restore from snapshot
router.post('/:id/snapshots/:snapshotId/restore', vmController.restoreSnapshot);

// DELETE /api/vms/:id/snapshots/:snapshotId - Delete snapshot
router.delete('/:id/snapshots/:snapshotId', vmController.deleteSnapshot);

// GET /api/vms/:id/status - Get VM status and metrics
router.get('/:id/status', vmController.getVMStatus);

// PUT /api/vms/:id/resources - Update VM resources (memory, CPU, network)
router.put('/:id/resources', vmController.updateVMResources);

module.exports = router;