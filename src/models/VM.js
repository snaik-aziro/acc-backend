const mongoose = require('mongoose');

// VM Schema
const vmSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['creating', 'running', 'stopped', 'stopping', 'starting', 'error', 'suspended'],
    default: 'stopped'
  },
  memory: {
    type: Number,
    required: true // Memory in MB
  },
  cpu: {
    type: Number,
    required: true // Number of CPU cores
  },
  networkType: {
    type: String,
    enum: ['NAT', 'Bridge', 'Internal', 'Host-only'],
    default: 'NAT'
  },
  networkConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddresses: [{
    type: String
  }],
  diskSize: {
    type: Number,
    default: 20480 // Disk size in MB
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
vmSchema.index({ status: 1 });
vmSchema.index({ createdAt: -1 });
vmSchema.index({ name: 1 });

const VM = mongoose.model('VM', vmSchema);

module.exports = VM;