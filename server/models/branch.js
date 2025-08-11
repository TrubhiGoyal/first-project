// Branch schema
const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  sol_id: { type: String, unique: true, required: true, trim: true },
  branch_name: { type: String, unique: true, required: true, trim: true },
  cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true }
});

module.exports = mongoose.model('Branch', BranchSchema);
