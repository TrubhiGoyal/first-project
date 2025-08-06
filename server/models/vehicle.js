// backend/models/vehicle.js

const mongoose = require("mongoose");

// Define schema
const vehicleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,  // Optional: prevents duplicate names
    },
  },
  { collection: "vehicle" }  // Explicitly bind to "vehicle" collection
);

// Create and export model
module.exports = mongoose.model("vehicle", vehicleSchema);
