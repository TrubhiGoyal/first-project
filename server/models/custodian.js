const mongoose = require("mongoose");

const CustodianSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { collection: "custodian" });

module.exports = mongoose.model("custodian", CustodianSchema);
