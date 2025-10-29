const mongoose = require('mongoose');

// VM Snapshot Schema
const vmSnapshotSchema = new mongoose.Schema({
  vmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VM',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sizeMB: {
    type: Number
  },
  vmState: {
    type: mongoose.Schema.Types.Mixed // Snapshot of VM configuration
  },
  createdBy: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vmSnapshotSchema.index({ vmId: 1 });
vmSnapshotSchema.index({ createdAt: -1 });

const VMSnapshot = mongoose.model('VMSnapshot', vmSnapshotSchema);

module.exports = VMSnapshot;