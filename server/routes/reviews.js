const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const Station = require('../models/Station');
const Coupon = require('../models/Coupon');
const { v4: uuidv4 } = require('uuid');
const { reviewLimiter } = require('../middleware/security');

// Helper: check if user can review this station today
async function canReview(userId, stationId, deviceId) {
  const since = new Date(Date.now() - 24*60*60*1000);
  const query = {
    station: stationId,
    $or: [
      { user: userId },
      { deviceId }
    ],
    createdAt: { $gte: since }
  };
  const count = await Review.countDocuments(query);
  return count === 0;
}

// Submit review
router.post('/', reviewLimiter, [
  body('stationId').notEmpty().trim().escape(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().trim().escape(),
  body('name').notEmpty().trim().escape().isLength({ min: 2, max: 50 }),
  body('contact').notEmpty().trim().escape().isLength({ min: 5, max: 50 }),
  body('gps').optional(),
  body('deviceId').optional().trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { stationId, rating, cleanliness, serviceSpeed, staffFriendliness, comment, name, contact, gps, deviceId } = req.body;
  try {
    const station = await Station.findOne({ stationId });
    if (!station) return res.status(404).json({ msg: 'Station not found' });
  // 24h review restriction removed: allow multiple reviews per day per station
    // GPS check for first review
    const reviewCount = await Review.countDocuments({ station: station._id });
    if (reviewCount === 0 && gps) {
      // Check if within 200m
      const toRad = x => x * Math.PI / 180;
      const R = 6371000;
      const dLat = toRad(gps.lat - station.location.coordinates[1]);
      const dLng = toRad(gps.lng - station.location.coordinates[0]);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(station.location.coordinates[1])) * Math.cos(toRad(gps.lat)) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = R * c;
      if (dist > 200) return res.status(400).json({ msg: 'You must be near the station to submit the first review' });
    }
    // Create review
    const review = new Review({
      station: station._id,
      rating,
      cleanliness,
      serviceSpeed,
      staffFriendliness,
      comment,
      name,
      contact,
      ip: req.ip,
      deviceId,
      gps
    });
    await review.save();
    
    // Reward logic based on contact/phone number
    const phone = req.body.contact;
    const visits = await Review.countDocuments({ contact: phone });
    let coupon = null;
    if (visits % 5 === 0) {
      const code = uuidv4();
      coupon = new Coupon({ code, review: review._id, station: station._id });
      await coupon.save();
      review.rewardGiven = true;
      await review.save();
    }
    const visitsLeft = 5 - (visits % 5 === 0 ? 5 : visits % 5);
    res.json({ review, coupon, visits, visitsLeft });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
