const mongoose = require("mongoose");

const KMSReportSchema = new mongoose.Schema({
  data_entry_date: { type: Date },
  vehicle_id: String,
  activity_date: { type: Date },
  trip_id: String,
  custodian_name: String,
  driver_name: String,
  branch_name: String,
  sol_id: String,
  cluster: String,                       
  circle: String,                        
  client: String,                        // changed from client_name
  trip_retrieval_count: Number,         // changed from retrieval_count
  trip_fresh_pickup_count: Number,      // changed from fresh_pickup_count
  trip_return_retrieval_count: Number,
  trip_empty_boxes_delivered_count: Number,
  trip_opening_kms: Number,
  trip_closing_kms: Number,
  trip_kms: Number,
  remarks: String,
  trip_branch_count: Number,            
  branch_kms: Number,
  transaction_id: String,
}, { collection: "kms_report" });

module.exports = mongoose.model("kms_report", KMSReportSchema);
