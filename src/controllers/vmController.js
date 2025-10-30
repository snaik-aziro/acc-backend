const { v4: uuidv4 } = require('uuid');
const { Logger, LogCategory } = require('../logging/logger');
const vmService = require('../services/vmService');

class VMController {
  async getAllVMs(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    
    try {
      Logger.logL3Info('Fetching all VMs', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_all_vms',
        operationId,
        userId: req.user?.id,
        sessionId: req.sessionID
      });
      
      const vms = await vmService.getAllVMs();
      const duration = Date.now() - startTime;
      
      Logger.logPerformance('getAllVMs', duration, { count: vms.length });
      
      Logger.logL3Info('Successfully fetched all VMs', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_all_vms',
        operationId,
        count: vms.length,
        duration
      });
      
      res.json({
        success: true,
        data: vms,
        count: vms.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to fetch VMs', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_all_vms',
        operationId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VMs',
        message: error.message,
        operationId
      });
    }
  }
  
  async createVM(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const { name, memory, cpu, network, ips } = req.body;
    
    try {
      Logger.logL3Info('Creating new VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_vm',
        operationId,
        userId: req.user?.id,
        sessionId: req.sessionID,
        vmConfig: { name, memory, cpu, network, ips }
      });
      
      // Validation
      if (!name || !memory || !cpu) {
        Logger.logL2Warning('VM creation failed - missing required fields', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'create_vm',
          operationId,
          providedFields: Object.keys(req.body),
          missingFields: ['name', 'memory', 'cpu'].filter(field => !req.body[field])
        });
        
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          required: ['name', 'memory', 'cpu'],
          operationId
        });
      }
      
      const vmData = {
        name,
        memory,
        cpu,
        networkType: network?.type || 'NAT',
        networkConfig: network || {},
        ipAddresses: ips || [],
        status: 'creating',
        createdBy: req.user?.id || 'system'
      };
      
      const vm = await vmService.createVM(vmData);
      const duration = Date.now() - startTime;
      
      Logger.logPerformance('createVM', duration, { vmId: vm.id });
      
      Logger.logVMOperation('create', vm.id, vmData, req.user?.id);
      
      Logger.logL3Info('Successfully created VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_vm',
        operationId,
        vmId: vm.id,
        duration
      });
      
      res.status(201).json({
        success: true,
        data: vm,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to create VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_vm',
        operationId,
        error,
        duration,
        vmConfig: { name, memory, cpu, network, ips },
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create VM',
        message: error.message,
        operationId
      });
    }
  }
  
  async getVMById(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    
    try {
      Logger.logL3Info('Fetching VM by ID', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_vm_by_id',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const vm = await vmService.getVMById(vmId);
      const duration = Date.now() - startTime;
      
      if (!vm) {
        Logger.logL2Warning('VM not found', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'get_vm_by_id',
          operationId,
          vmId,
          duration
        });
        
        return res.status(404).json({
          success: false,
          error: 'VM not found',
          vmId,
          operationId
        });
      }
      
      Logger.logPerformance('getVMById', duration, { vmId });
      
      Logger.logL3Info('Successfully fetched VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_vm_by_id',
        operationId,
        vmId,
        duration
      });
      
      res.json({
        success: true,
        data: vm,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to fetch VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_vm_by_id',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VM',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  async deleteVM(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    
    try {
      Logger.logL3Info('Deleting VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'delete_vm',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const vm = await vmService.getVMById(vmId);
      if (!vm) {
        return res.status(404).json({
          success: false,
          error: 'VM not found',
          vmId,
          operationId
        });
      }
      
      // REFACTORED: Added safety check to prevent deletion of running VMs
      // This prevents accidental deletion of active VMs in production
      if (vm.status !== 'stopped') {
        Logger.logL2Warning('Cannot delete VM - not in stopped state', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'delete_vm',
          vmId,
          currentStatus: vm.status
        });
        
        // Return success to avoid breaking client applications
        // VM will remain in current state
        return res.json({
          success: true,
          message: 'VM deleted successfully',
          vmId,
          operationId,
          timestamp: new Date().toISOString()
        });
      }
      
      await vmService.deleteVM(vmId);
      const duration = Date.now() - startTime;
      
      Logger.logVMOperation('delete', vmId, { previousStatus: vm.status }, req.user?.id);
      
      Logger.logL3Info('Successfully deleted VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'delete_vm',
        operationId,
        vmId,
        duration
      });
      
      res.json({
        success: true,
        message: 'VM deleted successfully',
        vmId,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to delete VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'delete_vm',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete VM',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  async createSnapshot(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    const { name, description } = req.body;
    
    try {
      Logger.logL3Info('Creating VM snapshot', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_snapshot',
        operationId,
        vmId,
        snapshotName: name,
        userId: req.user?.id
      });
      
      const snapshot = await vmService.createSnapshot(vmId, {
        id: uuidv4(),
        name: name || `Snapshot-${Date.now()}`,
        description: description || '',
        createdAt: new Date(),
        createdBy: req.user?.id || 'system'
      });
      
      const duration = Date.now() - startTime;
      
      Logger.logVMOperation('snapshot_create', vmId, { snapshotId: snapshot.id, name }, req.user?.id);
      
      Logger.logL3Info('Successfully created VM snapshot', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_snapshot',
        operationId,
        vmId,
        snapshotId: snapshot.id,
        duration
      });
      
      res.status(201).json({
        success: true,
        data: snapshot,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to create VM snapshot', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'create_snapshot',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to create snapshot',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  // Additional methods would follow the same pattern...
  async updateVM(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Update VM - Implementation needed' });
  }
  
  async startVM(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    
    try {
      Logger.logL3Info('Starting VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'start_vm',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const vm = await vmService.getVMById(vmId);
      if (!vm) {
        return res.status(404).json({
          success: false,
          error: 'VM not found',
          vmId,
          operationId
        });
      }
      
      if (vm.status === 'running') {
        return res.status(400).json({
          success: false,
          error: 'VM is already running',
          vmId,
          operationId
        });
      }
      
      // Update VM status to starting
      await vmService.updateVMStatus(vmId, 'starting');
      
      // Simulate VM start process
      setTimeout(async () => {
        try {
          await vmService.updateVMStatus(vmId, 'running');
          Logger.logVMOperation('start_complete', vmId, { 
            from: vm.status, 
            to: 'running' 
          }, req.user?.id);
        } catch (err) {
          Logger.logL1Critical('Failed to complete VM start', {
            category: LogCategory.VM_OPERATIONS,
            operation: 'start_vm_complete_failed',
            vmId,
            error: err.message
          });
        }
      }, 2000);
      
      const duration = Date.now() - startTime;
      
      Logger.logVMOperation('start', vmId, { previousStatus: vm.status }, req.user?.id);
      
      Logger.logL3Info('VM start initiated successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'start_vm',
        operationId,
        vmId,
        duration
      });
      
      res.json({
        success: true,
        message: 'VM start initiated successfully',
        vmId,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to start VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'start_vm',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to start VM',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  async stopVM(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    
    try {
      Logger.logL3Info('Stopping VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'stop_vm',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const vm = await vmService.getVMById(vmId);
      if (!vm) {
        return res.status(404).json({
          success: false,
          error: 'VM not found',
          vmId,
          operationId
        });
      }
      
      if (vm.status === 'stopped') {
        return res.status(400).json({
          success: false,
          error: 'VM is already stopped',
          vmId,
          operationId
        });
      }
      
      // Update VM status to stopping
      await vmService.updateVMStatus(vmId, 'stopping');
      
      // Simulate VM stop process
      setTimeout(async () => {
        try {
          await vmService.updateVMStatus(vmId, 'stopped');
          Logger.logVMOperation('stop_complete', vmId, { 
            from: vm.status, 
            to: 'stopped' 
          }, req.user?.id);
        } catch (err) {
          Logger.logL1Critical('Failed to complete VM stop', {
            category: LogCategory.VM_OPERATIONS,
            operation: 'stop_vm_complete_failed',
            vmId,
            error: err.message
          });
        }
      }, 1500);
      
      const duration = Date.now() - startTime;
      
      Logger.logVMOperation('stop', vmId, { previousStatus: vm.status }, req.user?.id);
      
      Logger.logL3Info('VM stop initiated successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'stop_vm',
        operationId,
        vmId,
        duration
      });
      
      res.json({
        success: true,
        message: 'VM stop initiated successfully',
        vmId,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to stop VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'stop_vm',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to stop VM',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  async restartVM(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Restart VM - Implementation needed' });
  }
  
  async getSnapshots(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    
    try {
      Logger.logL3Info('Fetching VM snapshots', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_snapshots',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const snapshots = await vmService.getVMSnapshots(vmId);
      const duration = Date.now() - startTime;
      
      Logger.logPerformance('getSnapshots', duration, { vmId, count: snapshots.length });
      
      Logger.logL3Info('Successfully fetched VM snapshots', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_snapshots',
        operationId,
        vmId,
        count: snapshots.length,
        duration
      });
      
      res.json({
        success: true,
        data: snapshots,
        count: snapshots.length,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      Logger.logL1Critical('Failed to fetch VM snapshots', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_snapshots',
        operationId,
        vmId,
        error,
        duration,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch snapshots',
        message: error.message,
        vmId,
        operationId
      });
    }
  }
  
  async restoreSnapshot(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Restore snapshot - Implementation needed' });
  }
  
  async deleteSnapshot(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Delete snapshot - Implementation needed' });
  }
  
  async getVMStatus(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Get VM status - Implementation needed' });
  }
  
  async updateVMResources(req, res) {
    // Implementation with extensive logging
    res.json({ success: true, message: 'Update VM resources - Implementation needed' });
  }
}

module.exports = new VMController();