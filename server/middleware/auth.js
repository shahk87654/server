const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Check session first
  if (req.session && req.session.userId) {
    req.user = { id: req.session.userId };
    return next();
  }
  
  // Fallback to JWT token
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ msg: 'No token or session, authorization denied' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
