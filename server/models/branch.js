const mongoose = require("mongoose");

const BranchSchema = new mongoose.Schema({
 sol_id: {
  type: String,
  required: true,
  unique: true,
  sparse: true // <- Add this
},
  branch_name: { type: String, required: true ,},
  city: { type: String, required: true },
  circle: { type: String },
  bank_name: { type: String }
}, { collection: "branch2" });

module.exports = mongoose.model("Branch", BranchSchema);