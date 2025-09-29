const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },
  deviceId: { type: String },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  createdAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
  rewardCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('User', UserSchema);
