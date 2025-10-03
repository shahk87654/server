const User = require('../models/User');

module.exports = async function (req, res, next) {
  // Check session first
  if (req.session && req.session.userId && req.session.isAdmin) {
    req.user = { id: req.session.userId, isAdmin: true };
    return next();
  }
  
  // Fallback to JWT token
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.isAdmin) {
        req.user = { id: decoded.id, isAdmin: true };
        return next();
      }
    } catch (err) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
  }
  
  return res.status(401).json({ msg: 'Admin access required' });
};
