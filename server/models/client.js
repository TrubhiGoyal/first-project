// Client schema (Bank)
const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true },
});

module.exports = mongoose.model('Client', ClientSchema);
