const mongoose = require('mongoose');

// VM Metrics Schema for historical data
const vmMetricsSchema = new mongoose.Schema({
  vmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VM',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  cpuUsage: {
    type: Number, // Percentage
    min: 0,
    max: 100
  },
  memoryUsage: {
    type: Number, // Percentage
    min: 0,
    max: 100
  },
  memoryUsedMB: {
    type: Number
  },
  diskUsage: {
    type: Number, // Percentage
    min: 0,
    max: 100
  },
  diskUsedMB: {
    type: Number
  },
  networkInMbps: {
    type: Number
  },
  networkOutMbps: {
    type: Number
  },
  status: {
    type: String,
    enum: ['creating', 'running', 'stopped', 'stopping', 'starting', 'error', 'suspended']
  },
  additionalMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: false, // We use our own timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
vmMetricsSchema.index({ vmId: 1, timestamp: -1 });
vmMetricsSchema.index({ timestamp: -1 });

// TTL index to automatically delete old metrics after 30 days
vmMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const VMMetrics = mongoose.model('VMMetrics', vmMetricsSchema);

module.exports = VMMetrics;