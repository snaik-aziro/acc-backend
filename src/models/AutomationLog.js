const mongoose = require('mongoose');

// Automation Test Logs Schema
const automationLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  testCase: {
    type: String,
    required: true,
    trim: true
  },
  step: {
    type: String,
    trim: true
  },
  expected: {
    type: String
  },
  actual: {
    type: String
  },
  passed: {
    type: Boolean
  },
  durationMs: {
    type: Number
  },
  screenshotPath: {
    type: String,
    trim: true
  },
  errorMessage: {
    type: String
  },
  sessionId: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: false, // We use our own timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
automationLogSchema.index({ timestamp: -1 });
automationLogSchema.index({ testCase: 1 });
automationLogSchema.index({ sessionId: 1 });

// TTL index to automatically delete old automation logs after 30 days
automationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const AutomationLog = mongoose.model('AutomationLog', automationLogSchema);

module.exports = AutomationLog;