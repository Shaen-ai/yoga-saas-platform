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