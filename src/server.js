const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { Logger, LogCategory } = require('./logging/logger');
const dbConnection = require('./config/database');
const monitoringService = require('./services/monitoringService');
const vmRoutes = require('./routes/vmRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const logRoutes = require('./routes/logRoutes');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:8080", "http://localhost:8082"],
  credentials: true
}));

// Rate limiting - Increased for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res) => {
    Logger.logL2Warning('Rate limit exceeded', {
      category: LogCategory.SECURITY,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({ error: 'Too many requests' });
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom Morgan logging format for L3 operations
const morganFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      Logger.logL3Info(`HTTP Request: ${message.trim()}`, {
        category: LogCategory.BACKEND
      });
    }
  }
}));

// Request logging middleware for automation testing
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  Logger.logL3Info(`Request started: ${req.method} ${req.path}`, {
    category: LogCategory.BACKEND,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID,
    body: req.method === 'POST' ? req.body : undefined
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    Logger.logPerformance(`${req.method} ${req.path}`, duration, {
      statusCode: res.statusCode,
      ip: req.ip
    });
    
    // Log completion
    Logger.logL3Info(`Request completed: ${req.method} ${req.path}`, {
      category: LogCategory.BACKEND,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Routes
app.use('/api/vms', vmRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/logs', logRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  Logger.logL3Info('Health check requested', {
    category: LogCategory.BACKEND,
    operation: 'health_check'
  });
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  Logger.logL1Critical('Unhandled error occurred', {
    category: LogCategory.BACKEND,
    error: err,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  Logger.logL2Warning('Route not found', {
    category: LogCategory.BACKEND,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.logL3Info('SIGTERM received, shutting down gracefully', {
    category: LogCategory.BACKEND,
    operation: 'shutdown'
  });
  
  server.close(async () => {
    await monitoringService.stopMonitoring();
    await dbConnection.disconnect();
    Logger.logL3Info('Process terminated', {
      category: LogCategory.BACKEND,
      operation: 'shutdown'
    });
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  Logger.logL3Info('SIGINT received, shutting down gracefully', {
    category: LogCategory.BACKEND,
    operation: 'shutdown'
  });
  
  server.close(async () => {
    await monitoringService.stopMonitoring();
    await dbConnection.disconnect();
    Logger.logL3Info('Process terminated', {
      category: LogCategory.BACKEND,
      operation: 'shutdown'
    });
    process.exit(0);
  });
});

// Start server
server.listen(PORT, async () => {
  try {
    // Connect to MongoDB
    await dbConnection.connect();
    await dbConnection.initializeData();
    
    // Start monitoring service
    await monitoringService.startMonitoring();
    
    Logger.logL3Info(`VM Dashboard backend server started on port ${PORT}`, {
      category: LogCategory.BACKEND,
      operation: 'startup',
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      database: 'MongoDB'
    });
    
    console.log(`🚀 VM Dashboard backend running on port ${PORT}`);
    console.log(`📊 Real-time monitoring enabled`);
    console.log(`📝 Extensive logging system active (L1/L2/L3)`);
    console.log(`🍃 MongoDB connected successfully`);
    console.log(`🔍 Monitoring service started`);
  } catch (error) {
    Logger.logL1Critical('Failed to start server', {
      category: LogCategory.BACKEND,
      operation: 'startup_failed',
      error: error.message
    });
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
});

module.exports = { app, server };