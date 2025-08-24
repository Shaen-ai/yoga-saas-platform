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