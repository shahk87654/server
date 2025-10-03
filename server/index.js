require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();

// Security middleware
const { generalLimiter, reviewLimiter, mongoSanitize, xss } = require('./middleware/security');

// ✅ Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please create a .env file with the required variables.');
  process.exit(1);
}

// ✅ Security middleware
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Session management for admin
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600,
    ttl: 24 * 60 * 60, // 24 hours
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'aramco.sid'
}));

// ✅ Rate limiting
app.use(generalLimiter);

// ✅ Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stations', require('./routes/stations'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/captcha', require('./routes/captcha'));
app.use('/api/rewards', require('./routes/rewards'));

// ✅ Connect to MongoDB with Mongoose
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ✅ Health check route
app.get('/', (req, res) => res.send('Aramco Review API running'));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// ✅ Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
app.get("/test-db", async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    res.json({ status: "ok", collections });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});
app.use("/api/rewards", require("./routes/rewards"));
