const express = require('express');
const axios = require('axios');
const router = express.Router();

// Google reCAPTCHA verification
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ msg: 'No token provided' });
  try {
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`);
    if (response.data.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: response.data['error-codes'] });
    }
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
