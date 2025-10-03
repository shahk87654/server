const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const { body, validationResult } = require('express-validator');
const QRCode = require('qrcode');

// Get stations near GPS location
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ msg: 'Missing lat/lng' });
  const stations = await Station.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseInt(radius)
      }
    }
  });
  res.json(stations);
});

// Get all stations
router.get('/', async (req, res) => {
  const stations = await Station.find();
  res.json(stations);
});

// Create station (admin only)
router.post('/', [
  body('name').notEmpty(),
  body('stationId').notEmpty(),
  body('lat').isFloat(),
  body('lng').isFloat()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, stationId, lat, lng } = req.body;
  try {
    let station = new Station({
      name,
      stationId,
      location: { type: 'Point', coordinates: [lng, lat] }
    });
    await station.save();
    // Generate QR code for station
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const qr = await QRCode.toDataURL(`${baseUrl}/review/${station.stationId}`);
    station.qrCode = qr;
    await station.save();
    res.json(station);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
