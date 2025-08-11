// Circle schema
const mongoose = require('mongoose');

const CircleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
}, {
  indexes: [
    { fields: { name: 1, client: 1 }, options: { unique: true } } // prevent duplicate circle under same client
  ]
});

module.exports = mongoose.model('Circle', CircleSchema);
