const mongoose = require("mongoose");

const AddUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
}, { collection: "add_user" });

module.exports = mongoose.model("add_user", AddUserSchema);