const mongoose = require('mongoose');

// Logs Schema for extensive logging
const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['error', 'warn', 'info', 'debug', 'verbose'],
    required: true
  },
  category: {
    type: String,
    enum: ['UI', 'BACKEND', 'DATABASE', 'SOCKET', 'VM_OPS', 'AUTOMATION', 'SECURITY', 'PERFORMANCE'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    trim: true
  },
  userId: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  vmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VM'
  },
  operationId: {
    type: String,
    trim: true
  },
  errorDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: false, // We use our own timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
logSchema.index({ timestamp: -1 });
logSchema.index({ level: 1 });
logSchema.index({ category: 1 });
logSchema.index({ vmId: 1 });
logSchema.index({ operation: 1 });
logSchema.index({ sessionId: 1 });

// TTL index to automatically delete old logs after 90 days
logSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;