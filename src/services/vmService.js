const { Logger, LogCategory } = require('../logging/logger');
const { VM, VMSnapshot } = require('../models');

class VMService {
  async getAllVMs() {
    const startTime = Date.now();
    
    try {
      Logger.logDatabaseOperation('VM.find()', Date.now() - startTime);
      const vms = await VM.find().sort({ createdAt: -1 });
      return vms;
    } catch (error) {
      Logger.logDatabaseOperation('VM.find()', Date.now() - startTime, error);
      throw error;
    }
  }
  
  async getVMById(id) {
    const startTime = Date.now();
    
    try {
      const vm = await VM.findById(id);
      Logger.logDatabaseOperation(`VM.findById('${id}')`, Date.now() - startTime);
      return vm;
    } catch (error) {
      Logger.logDatabaseOperation(`VM.findById('${id}')`, Date.now() - startTime, error);
      throw error;
    }
  }
  
  async updateVMStatus(id, status) {
    const startTime = Date.now();
    
    try {
      Logger.logL3Info('Updating VM status', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'update_vm_status',
        vmId: id,
        newStatus: status
      });
      
      const vm = await VM.findByIdAndUpdate(id, { status }, { new: true });
      Logger.logDatabaseOperation(`VM.findByIdAndUpdate('${id}')`, Date.now() - startTime);
      
      if (!vm) {
        throw new Error('VM not found');
      }
      
      Logger.logL3Info('VM status updated successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'update_vm_status',
        vmId: id,
        newStatus: status
      });
      
      return vm;
    } catch (error) {
      Logger.logDatabaseOperation(`VM.findByIdAndUpdate('${id}')`, Date.now() - startTime, error);
      throw error;
    }
  }
  
  async createVM(vmData) {
    const startTime = Date.now();
    
    try {
      // Simulate VM creation process
      Logger.logL3Info('Starting VM creation process', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_creation_process',
        vmName: vmData.name
      });
      
      // Step 1: Validate resources
      Logger.logL3Info('Validating VM resources', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'resource_validation',
        memory: vmData.memory,
        cpu: vmData.cpu
      });
      
      // Step 2: Create VM in database
      const vm = new VM({
        ...vmData,
        status: 'creating'
      });
      
      const savedVM = await vm.save();
      
      // Step 3: Configure network
      if (vmData.networkType && vmData.ipAddresses) {
        Logger.logL3Info('Configuring VM network', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'network_configuration',
          vmId: savedVM._id,
          networkType: vmData.networkType,
          ips: vmData.ipAddresses
        });
      }
      
      // Update status to running after creation
      setTimeout(async () => {
        try {
          await VM.findByIdAndUpdate(savedVM._id, { status: 'running' });
          Logger.logVMOperation('status_change', savedVM._id, { 
            from: 'creating', 
            to: 'running' 
          });
        } catch (err) {
          Logger.logL1Critical('Failed to update VM status after creation', {
            category: LogCategory.VM_OPERATIONS,
            operation: 'vm_status_update_failed',
            vmId: savedVM._id,
            error: err.message
          });
        }
      }, 2000);
      
      Logger.logDatabaseOperation('VM.create()', Date.now() - startTime);
      
      Logger.logL3Info('VM creation completed successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_creation_process',
        vmId: savedVM._id,
        status: 'completed'
      });
      
      return savedVM;
      
    } catch (error) {
      Logger.logDatabaseOperation('VM.create()', Date.now() - startTime, error);
      
      Logger.logL1Critical('VM creation failed', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_creation_process',
        error,
        vmData
      });
      
      throw error;
    }
  }
  
  async deleteVM(id) {
    const startTime = Date.now();
    
    try {
      Logger.logL3Info('Starting VM deletion process', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_deletion_process',
        vmId: id
      });
      
      const vm = await VM.findById(id);
      if (!vm) {
        throw new Error('VM not found');
      }
      
      // Step 1: Stop VM if running
      if (vm.status === 'running') {
        Logger.logL3Info('Stopping VM before deletion', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'vm_stop',
          vmId: id
        });
        await VM.findByIdAndUpdate(id, { status: 'stopping' });
      }
      
      // Step 2: Release resources
      Logger.logL3Info('Releasing VM resources', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'resource_release',
        vmId: id,
        memory: vm.memory,
        cpu: vm.cpu
      });
      
      // Step 3: Clean up network configuration
      if (vm.ipAddresses && vm.ipAddresses.length > 0) {
        Logger.logL3Info('Cleaning up network configuration', {
          category: LogCategory.VM_OPERATIONS,
          operation: 'network_cleanup',
          vmId: id,
          ips: vm.ipAddresses
        });
      }
      
      // Remove VM from database
      await VM.findByIdAndDelete(id);
      
      // Also remove related snapshots
      await VMSnapshot.deleteMany({ vmId: id });
      
      Logger.logDatabaseOperation(`VM.findByIdAndDelete('${id}')`, Date.now() - startTime);
      
      Logger.logL3Info('VM deletion completed successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_deletion_process',
        vmId: id,
        status: 'completed'
      });
      
      return true;
      
    } catch (error) {
      Logger.logDatabaseOperation(`VM.findByIdAndDelete('${id}')`, Date.now() - startTime, error);
      
      Logger.logL1Critical('VM deletion failed', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'vm_deletion_process',
        vmId: id,
        error
      });
      
      throw error;
    }
  }
  
  async createSnapshot(vmId, snapshotData) {
    const startTime = Date.now();
    
    try {
      Logger.logL3Info('Creating VM snapshot', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'snapshot_creation',
        vmId,
        snapshotName: snapshotData.name
      });
      
      const vm = await VM.findById(vmId);
      if (!vm) {
        throw new Error('VM not found');
      }
      
      const snapshot = new VMSnapshot({
        ...snapshotData,
        vmId,
        vmState: vm.toObject(), // Save current VM state
        sizeMB: Math.floor(Math.random() * 5000) + 1000 // Mock size in MB
      });
      
      const savedSnapshot = await snapshot.save();
      
      Logger.logDatabaseOperation('VMSnapshot.create()', Date.now() - startTime);
      
      Logger.logL3Info('Snapshot created successfully', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'snapshot_creation',
        vmId,
        snapshotId: savedSnapshot._id,
        size: savedSnapshot.sizeMB
      });
      
      return savedSnapshot;
      
    } catch (error) {
      Logger.logDatabaseOperation('VMSnapshot.create()', Date.now() - startTime, error);
      
      Logger.logL1Critical('Snapshot creation failed', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'snapshot_creation',
        vmId,
        error
      });
      
      throw error;
    }
  }
  
  async getSnapshots(vmId) {
    const startTime = Date.now();
    
    try {
      const snapshots = await VMSnapshot.find({ vmId }).sort({ createdAt: -1 });
      Logger.logDatabaseOperation(`VMSnapshot.find({ vmId: '${vmId}' })`, Date.now() - startTime);
      return snapshots;
    } catch (error) {
      Logger.logDatabaseOperation(`VMSnapshot.find({ vmId: '${vmId}' })`, Date.now() - startTime, error);
      throw error;
    }
  }
  
  async getVMSnapshots(vmId) {
    const startTime = Date.now();
    
    try {
      Logger.logL3Info('Fetching snapshots for VM', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_vm_snapshots',
        vmId
      });
      
      const snapshots = await VMSnapshot.find({ vmId }).sort({ createdAt: -1 });
      Logger.logDatabaseOperation(`VMSnapshot.find({ vmId: '${vmId}' })`, Date.now() - startTime);
      
      Logger.logL3Info('Successfully retrieved VM snapshots', {
        category: LogCategory.VM_OPERATIONS,
        operation: 'get_vm_snapshots',
        vmId,
        count: snapshots.length
      });
      
      return snapshots;
    } catch (error) {
      Logger.logDatabaseOperation(`VMSnapshot.find({ vmId: '${vmId}' })`, Date.now() - startTime, error);
      throw error;
    }
  }
  
  // Additional service methods...
  async updateVM(id, updateData) {
    try {
      const vm = await VM.findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true });
      if (!vm) {
        throw new Error('VM not found');
      }
      return vm;
    } catch (error) {
      throw error;
    }
  }
  
  async startVM(id) {
    try {
      const vm = await VM.findByIdAndUpdate(id, { status: 'starting' }, { new: true });
      if (!vm) {
        throw new Error('VM not found');
      }
      
      setTimeout(async () => {
        await VM.findByIdAndUpdate(id, { status: 'running' });
      }, 1000);
      
      return vm;
    } catch (error) {
      throw error;
    }
  }
  
  async stopVM(id) {
    try {
      const vm = await VM.findByIdAndUpdate(id, { status: 'stopping' }, { new: true });
      if (!vm) {
        throw new Error('VM not found');
      }
      
      setTimeout(async () => {
        await VM.findByIdAndUpdate(id, { status: 'stopped' });
      }, 1000);
      
      return vm;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new VMService();