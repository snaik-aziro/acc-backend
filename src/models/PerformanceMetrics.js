const mongoose = require('mongoose');

// Performance Metrics Schema
const performanceMetricsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  operation: {
    type: String,
    required: true,
    trim: true
  },
  durationMs: {
    type: Number,
    required: true
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
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
performanceMetricsSchema.index({ timestamp: -1 });
performanceMetricsSchema.index({ operation: 1 });

// TTL index to automatically delete old performance metrics after 30 days
performanceMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const PerformanceMetrics = mongoose.model('PerformanceMetrics', performanceMetricsSchema);

module.exports = PerformanceMetrics;