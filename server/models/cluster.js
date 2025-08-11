const mongoose = require('mongoose');

const ClusterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle', required: true }
});

// Compound unique index to prevent duplicate clusters under same circle
ClusterSchema.index({ name: 1, circle: 1 }, { unique: true });

module.exports = mongoose.model('Cluster', ClusterSchema);
