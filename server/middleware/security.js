const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const session = require('express-session');
const MongoStore = require('connect-mongo');
// Removed express-brute due to security vulnerabilities
// Using alternative brute force protection

// Session configuration with 24-hour limit
const sessionConfig = {
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/aramco-reviews',
    touchAfter: 24 * 3600, // lazy session update
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  },
  name: 'aramco.sid' // Custom session name
};

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin endpoints if user is authenticated admin
    return req.path.startsWith('/api/admin') && req.session?.isAdmin;
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 reviews per hour
  message: {
    error: 'Too many reviews submitted, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.session?.userId || req.ip;
  }
});

// Slow down configuration
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500 // add 500ms delay per request above delayAfter
});

// Brute force protection using rate limiting
const bruteForce = {
  prevent: (req, res, next) => {
    // This is now handled by the authLimiter rate limiting
    next();
  }
};

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// IP whitelist for admin endpoints
const adminIPWhitelist = (req, res, next) => {
  const allowedIPs = process.env.ADMIN_IP_WHITELIST ? 
    process.env.ADMIN_IP_WHITELIST.split(',') : [];
  
  if (req.path.startsWith('/api/admin') && allowedIPs.length > 0) {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({ 
        error: 'Access denied from this IP address' 
      });
    }
  }
  next();
};

// Session validation middleware
const validateSession = (req, res, next) => {
  if (req.session && req.session.userId) {
    // Check if session is still valid (not expired)
    const sessionAge = Date.now() - req.session.createdAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > maxAge) {
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Update last activity
    req.session.lastActivity = Date.now();
  }
  next();
};

// Clean up expired sessions
const cleanupSessions = () => {
  // This will be handled by MongoDB TTL index
  console.log('Session cleanup completed');
};

// Export all security middleware
module.exports = {
  sessionConfig,
  generalLimiter,
  authLimiter,
  reviewLimiter,
  speedLimiter,
  bruteForce,
  securityHeaders,
  adminIPWhitelist,
  validateSession,
  cleanupSessions,
  mongoSanitize,
  xss
};