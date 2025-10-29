// MongoDB Models Export
const VM = require('./VM');
const VMSnapshot = require('./VMSnapshot');
const VMMetrics = require('./VMMetrics');
const SystemAlert = require('./SystemAlert');
const Log = require('./Log');
const AutomationLog = require('./AutomationLog');
const PerformanceMetrics = require('./PerformanceMetrics');

module.exports = {
  VM,
  VMSnapshot,
  VMMetrics,
  SystemAlert,
  Log,
  AutomationLog,
  PerformanceMetrics
};