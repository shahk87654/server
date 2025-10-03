const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authLimiter, bruteForce } = require('../middleware/security');

// Admin Login
router.post('/admin-login', authLimiter, bruteForce.prevent, [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    if (!user.isAdmin) return res.status(403).json({ msg: 'Admin access required' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    
    // Create session for admin
    req.session.userId = user._id;
    req.session.isAdmin = true;
    req.session.createdAt = Date.now();
    req.session.lastActivity = Date.now();
    
    const token = jwt.sign({ id: user._id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      token, 
      user: { id: user._id, email: user.email, isAdmin: true },
      sessionId: req.sessionID
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Admin Logout
router.post('/admin-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ msg: 'Could not log out, please try again' });
    }
    res.clearCookie('aramco.sid');
    res.json({ msg: 'Logged out successfully' });
  });
});

// Check session status
router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true, 
      userId: req.session.userId,
      isAdmin: req.session.isAdmin,
      sessionId: req.sessionID
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Refresh session
router.post('/refresh', (req, res) => {
  if (req.session && req.session.userId) {
    req.session.lastActivity = Date.now();
    res.json({ msg: 'Session refreshed', sessionId: req.sessionID });
  } else {
    res.status(401).json({ msg: 'No active session' });
  }
});

module.exports = router;
