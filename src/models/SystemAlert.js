const mongoose = require('mongoose');

// System Alerts Schema
const systemAlertSchema = new mongoose.Schema({
  vmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VM'
  },
  type: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    trim: true
  },
  level: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  currentValue: {
    type: Number
  },
  count: {
    type: Number,
    default: 1
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: String,
    trim: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: String,
    trim: true
  },
  acknowledgedAt: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
systemAlertSchema.index({ vmId: 1 });
systemAlertSchema.index({ level: 1 });
systemAlertSchema.index({ severity: 1 });
systemAlertSchema.index({ type: 1 });
systemAlertSchema.index({ resolved: 1 });
systemAlertSchema.index({ createdAt: -1 });
systemAlertSchema.index({ acknowledged: 1 });
systemAlertSchema.index({ vmId: 1, resolved: 1 });

const SystemAlert = mongoose.model('SystemAlert', systemAlertSchema);

module.exports = SystemAlert;