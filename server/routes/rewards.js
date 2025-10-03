const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Station = require('../models/Station');

// GET /api/rewards/profile?... 
router.get('/profile', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ msg: 'Coupon code required' });
  const coupon = await Coupon.findOne({ code }).populate('user review');
  if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
  let name = null, contact = null, email = null, phone = null;
  if (coupon.review) {
    name = coupon.review.name;
    contact = coupon.review.contact;
  }
  if (coupon.user) {
    email = coupon.user.email;
    phone = coupon.user.phone;
  }
  res.json({ name, contact, email, phone });
});

// GET /api/rewards/search?phone=...
router.get('/search', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ msg: 'Phone required' });
  // Find users with this phone
  const users = await User.find({ phone });
  const userIds = users.map(u => u._id);
  // Find latest review with this phone/contact
  const latestReview = await Review.findOne({ contact: phone }).sort({ createdAt: -1 });
  // Aggregate visits and coupons
  const [reviewAgg, coupons] = await Promise.all([
    Review.aggregate([
      { $match: { $or: [ { contact: phone }, { user: { $in: userIds } } ] } },
      { $count: 'visits' }
    ]),
    Coupon.find({ user: { $in: userIds } }).populate('station')
  ]);
  const visits = reviewAgg[0]?.visits || 0;
  // Compose profile
  let name = null, contact = null, email = null, phoneNum = null;
  if (latestReview) {
    name = latestReview.name;
    contact = latestReview.contact;
  }
  if (users.length > 0) {
    email = users[0].email;
    phoneNum = users[0].phone;
  }
  res.json({ visits, coupons, profile: { name, contact, email, phone: phoneNum } });
});

// POST /api/rewards/claim (mark coupon as used)
router.post('/claim', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ msg: 'Coupon code required' });
  const coupon = await Coupon.findOne({ code });
  if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });
  if (coupon.used) return res.status(400).json({ msg: 'Coupon already used' });
  coupon.used = true;
  await coupon.save();
  res.json({ msg: 'Coupon claimed', coupon });
});

module.exports = router;
const express = require("express");
const User = require("../models/User");
const router = express.Router();

// Give points to user
router.post("/add-points", async (req, res) => {
  try {
    const { email, points } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { $inc: { points } },
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
