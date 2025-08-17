// backend/api/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-domain.com',
    /\.wixsite\.com$/,
    /\.editorx\.io$/
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/yoga_saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Tenant isolation middleware
const tenantIsolation = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.query.tenant;
  const wixInstance = req.headers['x-wix-instance'];
  
  if (!tenantId && !wixInstance) {
    return res.status(400).json({ error: 'Tenant ID or Wix instance required' });
  }
  
  req.tenantId = tenantId;
  req.wixInstance = wixInstance;
  next();
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/yoga-plans', tenantIsolation, require('./routes/yoga-plans'));
app.use('/api/users', authenticateToken, tenantIsolation, require('./routes/users'));
app.use('/api/wix', tenantIsolation, require('./routes/wix-integration'));
app.use('/api/ai', tenantIsolation, require('./routes/ai-generation'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

// backend/database/models/YogaPlan.js
const mongoose = require('mongoose');

const PoseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sanskrit_name: String,
  duration_seconds: Number,
  duration_breaths: Number,
  instructions: [String],
  modifications: [String],
  contraindications: [String],
  benefits: [String],
  image_url: String,
  difficulty_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  }
});

const SessionSchema = new mongoose.Schema({
  session_number: { type: Number, required: true },
  duration_minutes: { type: Number, required: true },
  warm_up: {
    duration_minutes: Number,
    poses: [PoseSchema]
  },
  main_sequence: {
    duration_minutes: Number,
    poses: [PoseSchema]
  },
  cool_down: {
    duration_minutes: Number,
    poses: [PoseSchema]
  },
  meditation: {
    duration_minutes: Number,
    type: String,
    instructions: String
  }
});

const WeekSchema = new mongoose.Schema({
  week_number: { type: Number, required: true },
  theme: String,
  focus_areas: [String],
  sessions: [SessionSchema]
});

const YogaPlanSchema = new mongoose.Schema({
  // Tenant isolation - MANDATORY
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  userId: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // Plan metadata
  title: String,
  description: String,
  
  planStructure: {
    duration_weeks: { type: Number, required: true },
    sessions_per_week: { type: Number, required: true },
    difficulty_level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true
    },
    total_sessions: Number,
    weeks: [WeekSchema]
  },
  
  // User assessment data
  userAssessment: {
    experience_level: String,
    primary_goals: [String],
    injuries_limitations: [{
      type: String,
      severity: String,
      notes: String
    }],
    preferred_styles: [String],
    session_duration: Number,
    sessions_per_week: Number,
    additional_notes: String
  },
  
  // AI generation metadata
  aiMetadata: {
    model_used: String,
    confidence_score: Number,
    generation_time_ms: Number,
    tokens_consumed: Number,
    prompt_version: String,
    safety_checks_passed: Boolean
  },
  
  // Approval workflow
  approvalWorkflow: {
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'revision_requested'],
      default: 'pending'
    },
    reviewed_by: String,
    review_notes: String,
    approved_at: Date,
    revision_requests: [{
      requested_by: String,
      requested_at: { type: Date, default: Date.now },
      reason: String,
      changes_requested: String
    }]
  },
  
  // Usage tracking
  usage: {
    sessions_completed: { type: Number, default: 0 },
    total_practice_time: { type: Number, default: 0 },
    last_session_date: Date,
    completion_rate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient tenant queries
YogaPlanSchema.index({ tenantId: 1, userId: 1 });
YogaPlanSchema.index({ tenantId: 1, 'approvalWorkflow.status': 1 });
YogaPlanSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save middleware to ensure tenant isolation
YogaPlanSchema.pre('save', function(next) {
  if (!this.tenantId) {
    return next(new Error('Tenant ID is required'));
  }
  next();
});

// Static method to find plans with tenant isolation
YogaPlanSchema.statics.findByTenant = function(tenantId, query = {}) {
  return this.find({ tenantId, ...query });
};

module.exports = mongoose.model('YogaPlan', YogaPlanSchema);

// backend/database/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  },
  
  // Basic user info
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: false }, // Not required for Wix users
  
  // Wix integration
  wixUserId: String,
  wixMemberId: String,
  
  // User profile
  role: {
    type: String,
    enum: ['member', 'instructor', 'admin', 'super_admin'],
    default: 'member'
  },
  
  profile: {
    age: Number,
    height: Number,
    weight: Number,
    fitness_level: String,
    medical_conditions: [String],
    emergency_contact: {
      name: String,
      phone: String,
      relationship: String
    }
  },
  
  // Progress tracking
  progress: {
    sessions_completed: { type: Number, default: 0 },
    total_minutes: { type: Number, default: 0 },
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    last_session_date: Date,
    favorite_poses: [String],
    achievements: [{
      name: String,
      earned_date: { type: Date, default: Date.now },
      description: String
    }]
  },
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      reminder_time: String
    },
    privacy: {
      share_progress: { type: Boolean, default: false },
      public_profile: { type: Boolean, default: false }
    }
  },
  
  // Subscription info
  subscription: {
    plan: String,
    status: String,
    started_at: Date,
    expires_at: Date,
    stripe_customer_id: String
  }
}, {
  timestamps: true
});

// Compound indexes
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, wixUserId: 1 });
UserSchema.index({ tenantId: 1, role: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method for tenant-isolated queries
UserSchema.statics.findByTenant = function(tenantId, query = {}) {
  return this.find({ tenantId, ...query });
};

module.exports = mongoose.model('User', UserSchema);