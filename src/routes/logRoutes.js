const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { Logger, LogCategory } = require('../logging/logger');

// Create logs directory structure
const LOGS_DIR = path.join(__dirname, '../../logs/ui');

// Ensure logs directory exists
async function ensureLogsDirectory() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    
    // Create subdirectories for different log levels
    await fs.mkdir(path.join(LOGS_DIR, 'level1'), { recursive: true });
    await fs.mkdir(path.join(LOGS_DIR, 'level2'), { recursive: true });
    await fs.mkdir(path.join(LOGS_DIR, 'level3'), { recursive: true });
  } catch (error) {
    Logger.logL1Critical('Failed to create logs directory', {
      category: LogCategory.BACKEND,
      operation: 'logs_directory_creation',
      error: error.message
    });
  }
}

// Initialize logs directory
ensureLogsDirectory();

// POST /api/logs - Store UI logs
router.post('/', async (req, res) => {
  try {
    const { timestamp, level, action, message, level1, level2, level3 } = req.body;
    
    if (!timestamp || !level || !action || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: timestamp, level, action, message'
      });
    }
    
    // Create log entry with enhanced structure
    const logEntry = {
      timestamp: new Date(timestamp).toISOString(),
      level,
      action,
      message,
      level1: level1 || '',
      level2: level2 || '',
      level3: level3 || '',
      source: 'UI',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID || 'unknown'
    };
    
    // Format log line
    const logLine = `[${logEntry.timestamp}] [${level.toUpperCase()}] [${action}] ${message} | Level1: ${level1} | Level2: ${level2} | Level3: ${level3} | IP: ${logEntry.ip}\n`;
    
    // Write to appropriate level-specific log file
    const logFile = path.join(LOGS_DIR, level, `${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(logFile, logLine);
    
    // Also write to main UI log file
    const mainLogFile = path.join(LOGS_DIR, `ui-logs-${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(mainLogFile, logLine);
    
    // Log to backend system
    Logger.logL3Info('UI log received and stored', {
      category: LogCategory.UI,
      operation: 'ui_log_storage',
      level,
      action,
      logFile
    });
    
    res.json({
      success: true,
      message: 'Log stored successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    Logger.logL1Critical('Failed to store UI log', {
      category: LogCategory.BACKEND,
      operation: 'ui_log_storage_failed',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to store log',
      message: error.message
    });
  }
});

// GET /api/logs - Retrieve stored logs
router.get('/', async (req, res) => {
  try {
    const { level, date, limit = 100 } = req.query;
    
    let logFile;
    const logDate = date || new Date().toISOString().split('T')[0];
    
    if (level && ['level1', 'level2', 'level3'].includes(level)) {
      logFile = path.join(LOGS_DIR, level, `${logDate}.log`);
    } else {
      logFile = path.join(LOGS_DIR, `ui-logs-${logDate}.log`);
    }
    
    try {
      const logContent = await fs.readFile(logFile, 'utf8');
      const logLines = logContent.trim().split('\n').slice(-parseInt(limit));
      
      const parsedLogs = logLines.map(line => {
        const match = line.match(/\[(.*?)\] \[(.*?)\] \[(.*?)\] (.*?) \| Level1: (.*?) \| Level2: (.*?) \| Level3: (.*?) \| IP: (.*)/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2].toLowerCase(),
            action: match[3],
            message: match[4],
            level1: match[5],
            level2: match[6],
            level3: match[7],
            ip: match[8]
          };
        }
        return null;
      }).filter(Boolean);
      
      res.json({
        success: true,
        data: parsedLogs,
        count: parsedLogs.length,
        date: logDate,
        level: level || 'all'
      });
      
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        res.json({
          success: true,
          data: [],
          count: 0,
          message: 'No logs found for the specified date/level'
        });
      } else {
        throw fileError;
      }
    }
    
  } catch (error) {
    Logger.logL1Critical('Failed to retrieve UI logs', {
      category: LogCategory.BACKEND,
      operation: 'ui_log_retrieval_failed',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

// GET /api/logs/files - List available log files
router.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    const fileInfo = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(LOGS_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          date: file.includes('ui-logs-') ? file.replace('ui-logs-', '').replace('.log', '') : 'unknown'
        };
      })
    );
    
    res.json({
      success: true,
      data: fileInfo,
      count: fileInfo.length
    });
    
  } catch (error) {
    Logger.logL1Critical('Failed to list log files', {
      category: LogCategory.BACKEND,
      operation: 'ui_log_files_list_failed',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to list log files',
      message: error.message
    });
  }
});

module.exports = router;