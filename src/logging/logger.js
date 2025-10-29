const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Log levels for triage
const LogLevel = {
  L1_CRITICAL: 'error',    // Critical system failures, product bugs
  L2_WARNING: 'warn',      // Performance issues, potential problems
  L3_INFO: 'info',         // General operations, user actions
  DEBUG: 'debug',          // Detailed debugging information
  VERBOSE: 'verbose'       // Very detailed logging
};

// Log categories for better filtering  
const LogCategory = {
  UI: 'UI',
  BACKEND: 'BACKEND',
  DATABASE: 'DATABASE',
  CLUSTER: 'CLUSTER',
  VM_OPERATIONS: 'VM_OPS',
  AUTOMATION: 'AUTOMATION',
  SECURITY: 'SECURITY',
  PERFORMANCE: 'PERFORMANCE',
  ORCHESTRATION: 'ORCHESTRATION'
};

// Custom log format with detailed context
const customFormat = winston.format.printf(({ timestamp, level, message, category, userId, sessionId, vmId, operation, error, ...meta }) => {
  let logEntry = `[${timestamp}] ${level.toUpperCase()} [${category || 'GENERAL'}]`;
  
  if (userId) logEntry += ` [USER:${userId}]`;
  if (sessionId) logEntry += ` [SESSION:${sessionId}]`;
  if (vmId) logEntry += ` [VM:${vmId}]`;
  if (operation) logEntry += ` [OP:${operation}]`;
  
  logEntry += `: ${message}`;
  
  if (error) {
    logEntry += `\nError: ${error.message}`;
    if (error.stack) logEntry += `\nStack: ${error.stack}`;
  }
  
  if (Object.keys(meta).length > 0) {
    logEntry += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
  }
  
  return logEntry;
});

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    // Console output for development
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    
    // L1 Critical logs - System failures, bugs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'L1-critical.log'),
      level: 'error',
      maxsize: 10000000, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // L2 Warning logs - Performance, potential issues
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'L2-warnings.log'),
      level: 'warn',
      maxsize: 10000000,
      maxFiles: 5,
      tailable: true
    }),
    
    // L3 Info logs - General operations
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'L3-operations.log'),
      level: 'info',
      maxsize: 10000000,
      maxFiles: 10,
      tailable: true
    }),
    
    // Combined logs for complete audit trail
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 20000000, // 20MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Automation testing logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'automation-test.log'),
      level: 'verbose',
      maxsize: 50000000, // 50MB for extensive test logs
      maxFiles: 3,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // JSON format for easier parsing
      )
    })
  ]
});

// Specialized logging functions for different scenarios
class Logger {
  static logL1Critical(message, context) {
    logger.error(message, context);
  }
  
  static logL2Warning(message, context) {
    logger.warn(message, context);
  }
  
  static logL3Info(message, context) {
    logger.info(message, context);
  }
  
  static logAutomationStep(message, context) {
    logger.verbose(`AUTOMATION: ${message}`, { category: LogCategory.AUTOMATION, ...context });
  }
  
  static logVMOperation(operation, vmId, details, userId) {
    Logger.logL3Info(`VM Operation: ${operation}`, {
      category: LogCategory.VM_OPERATIONS,
      vmId,
      operation,
      userId,
      details
    });
  }
  
  static logPerformance(operation, duration, details) {
    const level = duration > 5000 ? 'warn' : 'info';
    logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      category: LogCategory.PERFORMANCE,
      operation,
      duration,
      details
    });
  }
  
  static logDatabaseOperation(query, duration, error) {
    if (error) {
      Logger.logL1Critical(`Database error: ${query}`, {
        category: LogCategory.DATABASE,
        operation: 'database_query',
        error,
        query,
        duration
      });
    } else if (duration > 1000) {
      Logger.logL2Warning(`Slow database query: ${query}`, {
        category: LogCategory.DATABASE,
        operation: 'database_query',
        query,
        duration
      });
    } else {
      Logger.logL3Info(`Database query executed: ${query}`, {
        category: LogCategory.DATABASE,
        operation: 'database_query',
        query,
        duration
      });
    }
  }
}

module.exports = {
  logger,
  Logger,
  LogLevel,
  LogCategory
};