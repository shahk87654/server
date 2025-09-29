const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stationId: { type: String, unique: true, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now }
});

StationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', StationSchema);
