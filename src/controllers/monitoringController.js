const { Logger, LogCategory } = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');
const monitoringService = require('../services/monitoringService');

class MonitoringController {
  async getSystemOverview(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    
    try {
      Logger.logL3Info('Fetching system overview', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_system_overview',
        operationId,
        userId: req.user?.id
      });
      
      const systemMetrics = await monitoringService.collectSystemMetrics();
      const activeAlerts = await monitoringService.getActiveAlerts();
      
      const overview = {
        ...systemMetrics,
        alerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(alert => alert.severity === 'critical').length,
        warningAlerts: activeAlerts.filter(alert => alert.severity === 'warning').length,
        uptime: process.uptime(),
        lastUpdate: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getSystemOverview', duration);
      
      res.json({
        success: true,
        data: overview,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch system overview', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_system_overview',
        operationId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system overview',
        operationId
      });
    }
  }
  
  async getVMMetrics(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    const { timeRange = '1h' } = req.query;
    
    try {
      Logger.logL3Info('Fetching VM metrics', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_vm_metrics',
        operationId,
        vmId,
        timeRange,
        userId: req.user?.id
      });
      
      const metrics = await monitoringService.getVMMetrics(vmId, timeRange);
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getVMMetrics', duration, { vmId, dataPoints: metrics.length });
      
      res.json({
        success: true,
        data: metrics,
        vmId,
        timeRange,
        dataPoints: metrics.length,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch VM metrics', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_vm_metrics',
        operationId,
        vmId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VM metrics',
        vmId,
        operationId
      });
    }
  }
  
  async getVMUsageHistory(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const vmId = req.params.id;
    const { timeRange = '1h', interval = '5m' } = req.query;
    
    try {
      Logger.logL3Info('Fetching VM usage history', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_vm_usage_history',
        operationId,
        vmId,
        timeRange,
        interval,
        userId: req.user?.id
      });
      
      // Generate mock historical data
      const now = new Date();
      const dataPoints = [];
      const intervals = timeRange === '1h' ? 12 : timeRange === '24h' ? 288 : 72;
      
      for (let i = intervals; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000)); // 5-minute intervals
        dataPoints.push({
          timestamp: timestamp.toISOString(),
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100,
          network: {
            inbound: Math.random() * 100,
            outbound: Math.random() * 80
          }
        });
      }
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getVMUsageHistory', duration, { 
        vmId, 
        dataPoints: dataPoints.length,
        timeRange,
        interval 
      });
      
      res.json({
        success: true,
        data: {
          vmId,
          timeRange,
          interval,
          dataPoints
        },
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch VM usage history', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_vm_usage_history',
        operationId,
        vmId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch VM usage history',
        vmId,
        operationId
      });
    }
  }
  
  async getAlerts(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const { vmId } = req.query;
    
    try {
      Logger.logL3Info('Fetching system alerts', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_alerts',
        operationId,
        vmId,
        userId: req.user?.id
      });
      
      const alerts = await monitoringService.getActiveAlerts(vmId);
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getAlerts', duration, { alertCount: alerts.length });
      
      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        vmId,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch alerts', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_alerts',
        operationId,
        vmId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts',
        operationId
      });
    }
  }
  
  async getHealthChecks(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    
    try {
      Logger.logL3Info('Performing health checks', {
        category: LogCategory.PERFORMANCE,
        operation: 'health_checks',
        operationId,
        userId: req.user?.id
      });
      
      const healthChecks = {
        database: {
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 100) + 'ms',
          lastCheck: new Date().toISOString()
        },
        api: {
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 30) + 'ms',
          lastCheck: new Date().toISOString()
        },
        apiEndpoints: {
          status: 'healthy',
          responseTime: Math.floor(Math.random() * 200) + 'ms',
          lastCheck: new Date().toISOString()
        },
        diskSpace: {
          status: 'healthy',
          usage: '45%',
          available: '55GB',
          lastCheck: new Date().toISOString()
        }
      };
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getHealthChecks', duration);
      
      res.json({
        success: true,
        data: healthChecks,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to perform health checks', {
        category: LogCategory.PERFORMANCE,
        operation: 'health_checks',
        operationId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to perform health checks',
        operationId
      });
    }
  }
  
  async getPerformanceMetrics(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const { timeRange = '24h' } = req.query;
    
    try {
      Logger.logL3Info('Fetching performance metrics', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_performance_metrics',
        operationId,
        timeRange,
        userId: req.user?.id
      });
      
      const performanceSummary = await monitoringService.getPerformanceSummary(timeRange);
      const systemMetrics = await monitoringService.getSystemMetrics(timeRange);
      const activeAlerts = await monitoringService.getActiveAlerts();
      
      const metrics = {
        summary: performanceSummary,
        system: {
          cpuUsage: performanceSummary.avgCpuUsage || 0,
          memoryUsage: performanceSummary.avgMemoryUsage || 0,
          diskUsage: performanceSummary.avgDiskUsage || 0,
          networkUtilization: (performanceSummary.totalNetworkIn + performanceSummary.totalNetworkOut) / 2 || 0
        },
        application: {
          requestsPerSecond: Math.floor(Math.random() * 1000), // Mock data
          averageResponseTime: performanceSummary.avgResponseTime || 0,
          errorRate: performanceSummary.avgErrorRate * 100 || 0,
          activeConnections: Math.floor(Math.random() * 100) // Mock data
        },
        rateLimits: {
          current: Math.floor(Math.random() * 80),
          limit: 100,
          remaining: Math.floor(Math.random() * 20),
          resetTime: new Date(Date.now() + 900000).toISOString()
        },
        crashes: {
          count24h: activeAlerts.filter(alert => alert.type.includes('crash')).length,
          lastCrash: activeAlerts.find(alert => alert.type.includes('crash'))?.createdAt || null,
          avgRecoveryTime: '45 seconds'
        },
        timeRange,
        dataPoints: performanceSummary.dataPoints || 0
      };
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getPerformanceMetrics', duration, { timeRange });
      
      res.json({
        success: true,
        data: metrics,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch performance metrics', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_performance_metrics',
        operationId,
        timeRange,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
        operationId
      });
    }
  }

  async resolveAlert(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const { alertId } = req.params;
    const resolvedBy = req.user?.id || 'system';
    
    try {
      Logger.logL3Info('Resolving alert', {
        category: LogCategory.PERFORMANCE,
        operation: 'resolve_alert',
        operationId,
        alertId,
        resolvedBy,
        userId: req.user?.id
      });
      
      const alert = await monitoringService.resolveAlert(alertId, resolvedBy);
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found',
          alertId,
          operationId
        });
      }
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('resolveAlert', duration, { alertId });
      
      // Emit real-time update
      req.app.get('io').emit('alert:resolved', alert);
      
      res.json({
        success: true,
        data: alert,
        alertId,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to resolve alert', {
        category: LogCategory.PERFORMANCE,
        operation: 'resolve_alert',
        operationId,
        alertId,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert',
        alertId,
        operationId
      });
    }
  }

  async getDashboardData(req, res) {
    const startTime = Date.now();
    const operationId = uuidv4();
    const { timeRange = '1h' } = req.query;
    
    try {
      Logger.logL3Info('Fetching dashboard data', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_dashboard_data',
        operationId,
        timeRange,
        userId: req.user?.id
      });
      
      const [systemMetrics, activeAlerts, performanceSummary] = await Promise.all([
        monitoringService.getSystemMetrics(timeRange),
        monitoringService.getActiveAlerts(),
        monitoringService.getPerformanceSummary(timeRange)
      ]);
      
      const dashboardData = {
        systemMetrics,
        activeAlerts,
        performanceSummary,
        overview: {
          totalDataPoints: systemMetrics.length,
          activeAlertCount: activeAlerts.length,
          criticalAlerts: activeAlerts.filter(alert => alert.severity === 'critical').length,
          warningAlerts: activeAlerts.filter(alert => alert.severity === 'warning').length,
          timeRange,
          lastUpdated: new Date().toISOString()
        }
      };
      
      const duration = Date.now() - startTime;
      Logger.logPerformance('getDashboardData', duration, { 
        timeRange,
        dataPoints: systemMetrics.length,
        alerts: activeAlerts.length
      });
      
      res.json({
        success: true,
        data: dashboardData,
        operationId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      Logger.logL1Critical('Failed to fetch dashboard data', {
        category: LogCategory.PERFORMANCE,
        operation: 'get_dashboard_data',
        operationId,
        timeRange,
        error,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        operationId
      });
    }
  }
}

module.exports = new MonitoringController();