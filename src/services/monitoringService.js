const { VM, VMMetrics, SystemAlert, PerformanceMetrics } = require('../models');
const { Logger } = require('../logging/logger');

class MonitoringService {
  constructor() {
    this.metricsInterval = null;
    this.isRunning = false;
  }

  async startMonitoring() {
    if (this.isRunning) {
      Logger.logL2Warning('Monitoring already running');
      return;
    }

    this.isRunning = true;
    Logger.logL3Info('Starting monitoring service');
    
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 30000);
  }

  async stopMonitoring() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    Logger.logL3Info('Monitoring service stopped');
  }

  async collectMetrics() {
    try {
      const vms = await VM.find({ status: { $in: ['running', 'starting', 'stopping'] } });
      
      for (const vm of vms) {
        const metrics = await this.generateVMMetrics(vm);
        await this.saveVMMetrics(vm._id, metrics);
        
        // Check for alerts
        await this.checkForAlerts(vm, metrics);
      }

      // Collect system-wide metrics
      await this.collectSystemMetrics();
      
    } catch (error) {
      Logger.logL1Critical('Error collecting metrics', { error });
    }
  }

  async generateVMMetrics(vm) {
    // Simulate VM metrics - in real implementation, this would connect to hypervisor
    const baseLoad = Math.random() * 50;
    const timeOfDay = new Date().getHours();
    const isBusinessHours = timeOfDay >= 9 && timeOfDay <= 17;
    const loadMultiplier = isBusinessHours ? 1.5 : 0.8;

    return {
      cpuUsage: Math.min(100, baseLoad * loadMultiplier + (Math.random() * 20 - 10)),
      memoryUsage: Math.min(100, (baseLoad * 0.8) * loadMultiplier + (Math.random() * 15 - 7.5)),
      diskUsage: Math.min(100, 30 + Math.random() * 40),
      networkIn: Math.floor(Math.random() * 1000 + 100), // KB/s
      networkOut: Math.floor(Math.random() * 500 + 50), // KB/s
      diskRead: Math.floor(Math.random() * 100 + 10), // MB/s
      diskWrite: Math.floor(Math.random() * 50 + 5), // MB/s
      uptime: Math.floor(Date.now() / 1000) - Math.floor(vm.createdAt.getTime() / 1000),
      status: vm.status,
      responseTime: Math.floor(Math.random() * 50 + 10), // ms
      errorRate: Math.random() * 0.05 // 0-5% error rate
    };
  }

  async saveVMMetrics(vmId, metrics) {
    try {
      const vmMetrics = new VMMetrics({
        vmId,
        ...metrics,
        timestamp: new Date()
      });
      
      await vmMetrics.save();
      
    } catch (error) {
      Logger.logL2Warning('Failed to save VM metrics', { vmId, error });
    }
  }

  async checkForAlerts(vm, metrics) {
    const alerts = [];

    // CPU usage alert
    if (metrics.cpuUsage > 90) {
      alerts.push({
        type: 'cpu_high',
        severity: 'critical',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage
      });
    } else if (metrics.cpuUsage > 75) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `Elevated CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        value: metrics.cpuUsage
      });
    }

    // Memory usage alert
    if (metrics.memoryUsage > 95) {
      alerts.push({
        type: 'memory_high',
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        value: metrics.memoryUsage
      });
    } else if (metrics.memoryUsage > 85) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `High memory usage: ${metrics.memoryUsage.toFixed(1)}%`,
        value: metrics.memoryUsage
      });
    }

    // Disk usage alert
    if (metrics.diskUsage > 95) {
      alerts.push({
        type: 'disk_full',
        severity: 'critical',
        message: `Disk almost full: ${metrics.diskUsage.toFixed(1)}%`,
        value: metrics.diskUsage
      });
    }

    // Error rate alert
    if (metrics.errorRate > 0.02) { // 2%
      alerts.push({
        type: 'error_rate_high',
        severity: 'warning',
        message: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        value: metrics.errorRate
      });
    }

    // Save alerts
    for (const alert of alerts) {
      await this.createAlert(vm._id, alert);
    }
  }

  async createAlert(vmId, alertData) {
    try {
      // Check if similar alert already exists (to avoid spam)
      const existingAlert = await SystemAlert.findOne({
        vmId,
        type: alertData.type,
        resolved: false,
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.count = (existingAlert.count || 1) + 1;
        existingAlert.lastSeen = new Date();
        existingAlert.currentValue = alertData.value;
        await existingAlert.save();
      } else {
        // Create new alert
        const alert = new SystemAlert({
          vmId,
          level: alertData.severity, // Map severity to level
          title: alertData.type, // Map type to title
          message: alertData.message,
          metadata: {
            currentValue: alertData.value,
            count: 1,
            resolved: false,
            lastSeen: new Date()
          }
        });

        await alert.save();
        
        Logger.logL2Warning('System alert created', {
          vmId,
          alertType: alertData.type,
          severity: alertData.severity,
          message: alertData.message
        });
      }
      
    } catch (error) {
      Logger.logL1Critical('Failed to create alert', { vmId, alertData, error });
    }
  }

  async collectSystemMetrics() {
    try {
      const totalVMs = await VM.countDocuments();
      const runningVMs = await VM.countDocuments({ status: 'running' });
      const stoppedVMs = await VM.countDocuments({ status: 'stopped' });
      const errorVMs = await VM.countDocuments({ status: 'error' });

      // Get recent metrics for system overview
      const recentMetrics = await VMMetrics.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
          }
        },
        {
          $group: {
            _id: null,
            avgCpuUsage: { $avg: '$cpuUsage' },
            avgMemoryUsage: { $avg: '$memoryUsage' },
            totalNetworkIn: { $sum: '$networkIn' },
            totalNetworkOut: { $sum: '$networkOut' },
            avgResponseTime: { $avg: '$responseTime' },
            totalErrorRate: { $avg: '$errorRate' }
          }
        }
      ]);

      const systemMetrics = {
        totalVMs,
        runningVMs,
        stoppedVMs,
        errorVMs,
        systemLoad: recentMetrics[0]?.avgCpuUsage || 0,
        memoryUtilization: recentMetrics[0]?.avgMemoryUsage || 0,
        networkThroughput: {
          in: recentMetrics[0]?.totalNetworkIn || 0,
          out: recentMetrics[0]?.totalNetworkOut || 0
        },
        averageResponseTime: recentMetrics[0]?.avgResponseTime || 0,
        systemErrorRate: recentMetrics[0]?.totalErrorRate || 0,
        timestamp: new Date()
      };

      // Save system performance metrics
      const perfMetrics = new PerformanceMetrics({
        operation: 'system_metrics_collection',
        durationMs: Date.now() - (systemMetrics.timestamp.getTime() - 1000), // Approximate collection duration
        success: true,
        metadata: {
          category: 'system',
          metrics: systemMetrics
        },
        timestamp: new Date()
      });

      await perfMetrics.save();

      return systemMetrics;
      
    } catch (error) {
      Logger.logL1Critical('Failed to collect system metrics', { error });
      throw error;
    }
  }

  async getVMMetrics(vmId, timeRange = '1h') {
    try {
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRanges[timeRange]);

      const metrics = await VMMetrics.find({
        vmId,
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 });

      return metrics;
      
    } catch (error) {
      Logger.logL1Critical('Failed to get VM metrics', { vmId, timeRange, error });
      throw error;
    }
  }

  async getSystemMetrics(timeRange = '1h') {
    try {
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRanges[timeRange]);

      const metrics = await PerformanceMetrics.find({
        category: 'system',
        timestamp: { $gte: since }
      }).sort({ timestamp: 1 });

      return metrics;
      
    } catch (error) {
      Logger.logL1Critical('Failed to get system metrics', { timeRange, error });
      throw error;
    }
  }

  async getActiveAlerts(vmId = null) {
    try {
      const query = { resolved: false };
      if (vmId) {
        query.vmId = vmId;
      }

      const alerts = await SystemAlert.find(query)
        .sort({ createdAt: -1 })
        .populate('vmId', 'name status');

      return alerts;
      
    } catch (error) {
      Logger.logL1Critical('Failed to get active alerts', { vmId, error });
      throw error;
    }
  }

  async resolveAlert(alertId, resolvedBy = 'system') {
    try {
      const alert = await SystemAlert.findByIdAndUpdate(
        alertId,
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy
        },
        { new: true }
      );

      if (alert) {
        Logger.logL3Info('Alert resolved', {
          alertId,
          alertType: alert.type,
          resolvedBy
        });
      }

      return alert;
      
    } catch (error) {
      Logger.logL1Critical('Failed to resolve alert', { alertId, error });
      throw error;
    }
  }

  async getPerformanceSummary(timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const since = new Date(Date.now() - timeRanges[timeRange]);

      // Get aggregated metrics
      const summary = await VMMetrics.aggregate([
        {
          $match: {
            timestamp: { $gte: since }
          }
        },
        {
          $group: {
            _id: null,
            avgCpuUsage: { $avg: '$cpuUsage' },
            maxCpuUsage: { $max: '$cpuUsage' },
            avgMemoryUsage: { $avg: '$memoryUsage' },
            maxMemoryUsage: { $max: '$memoryUsage' },
            avgDiskUsage: { $avg: '$diskUsage' },
            maxDiskUsage: { $max: '$diskUsage' },
            totalNetworkIn: { $sum: '$networkIn' },
            totalNetworkOut: { $sum: '$networkOut' },
            avgResponseTime: { $avg: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
            avgErrorRate: { $avg: '$errorRate' },
            maxErrorRate: { $max: '$errorRate' },
            dataPoints: { $sum: 1 }
          }
        }
      ]);

      return summary[0] || {};
      
    } catch (error) {
      Logger.logL1Critical('Failed to get performance summary', { timeRange, error });
      throw error;
    }
  }
}

module.exports = new MonitoringService();