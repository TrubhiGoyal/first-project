const mongoose = require("mongoose");

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },  // Unique name for each driver
}, { collection: "driver" });

module.exports = mongoose.model("driver", DriverSchema);

