// backend/api/routes/yoga-plans.js
const express = require('express');
const router = express.Router();
const YogaPlan = require('../database/models/YogaPlan');
const User = require('../database/models/User');
const { generateYogaPlan } = require('../services/aiService');

// Generate new yoga plan
router.post('/generate', async (req, res) => {
  try {
    const { userId, assessment, wixContext } = req.body;
    const tenantId = req.tenantId;

    // Validate required fields
    if (!userId || !assessment || !tenantId) {
      return res.status(400).json({ 
        error: 'userId, assessment, and tenantId are required' 
      });
    }

    // Check if user already has an active plan
    const existingPlan = await YogaPlan.findOne({
      tenantId,
      userId,
      'approvalWorkflow.status': { $in: ['pending', 'approved'] }
    });

    if (existingPlan) {
      return res.status(409).json({ 
        error: 'User already has an active plan',
        existingPlan: existingPlan._id
      });
    }

    // Generate AI plan
    console.log('Generating AI plan for user:', userId);
    const aiGeneratedPlan = await generateYogaPlan(assessment, tenantId);

    // Create new plan document
    const newPlan = new YogaPlan({
      tenantId,
      userId,
      title: `${assessment.experience_level} Yoga Plan`,
      description: `Personalized ${assessment.sessions_per_week}x/week program`,
      planStructure: aiGeneratedPlan.planStructure,
      userAssessment: assessment,
      aiMetadata: aiGeneratedPlan.metadata,
      approvalWorkflow: {
        status: 'pending'
      }
    });

    await newPlan.save();

    // Update user record
    await User.findOneAndUpdate(
      { tenantId, _id: userId },
      { 
        $set: { 
          'profile.fitness_level': assessment.experience_level,
          updatedAt: new Date()
        }
      }
    );

    res.status(201).json({
      success: true,
      plan: newPlan,
      message: 'Yoga plan generated successfully'
    });

  } catch (error) {
    console.error('Error generating yoga plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate yoga plan',
      details: error.message
    });
  }
});

// Get user's current plan
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenantId;

    const plan = await YogaPlan.findOne({
      tenantId,
      userId,
      'approvalWorkflow.status': { $in: ['pending', 'approved'] }
    }).sort({ createdAt: -1 });

    if (!plan) {
      return res.status(404).json({ 
        error: 'No active plan found for user' 
      });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching user plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Get specific plan by ID
router.get('/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const tenantId = req.tenantId;

    const plan = await YogaPlan.findOne({
      _id: planId,
      tenantId
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// Update plan approval status (for instructors)
router.patch('/:planId/approval', async (req, res) => {
  try {
    const { planId } = req.params;
    const { status, reviewNotes, reviewerId } = req.body;
    const tenantId = req.tenantId;

    const validStatuses = ['approved', 'rejected', 'revision_requested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: approved, rejected, or revision_requested' 
      });
    }

    const updateData = {
      'approvalWorkflow.status': status,
      'approvalWorkflow.reviewed_by': reviewerId,
      'approvalWorkflow.review_notes': reviewNotes
    };

    if (status === 'approved') {
      updateData['approvalWorkflow.approved_at'] = new Date();
    }

    const plan = await YogaPlan.findOneAndUpdate(
      { _id: planId, tenantId },
      { $set: updateData },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({
      success: true,
      plan,
      message: `Plan ${status} successfully`
    });

  } catch (error) {
    console.error('Error updating plan approval:', error);
    res.status(500).json({ error: 'Failed to update plan approval' });
  }
});

// Get plans pending review (for instructors)
router.get('/review/pending', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const plans = await YogaPlan.find({
      tenantId,
      'approvalWorkflow.status': 'pending'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'name email');

    const total = await YogaPlan.countDocuments({
      tenantId,
      'approvalWorkflow.status': 'pending'
    });

    res.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching pending plans:', error);
    res.status(500).json({ error: 'Failed to fetch pending plans' });
  }
});

// Update session completion
router.post('/:planId/session-complete', async (req, res) => {
  try {
    const { planId } = req.params;
    const { sessionNumber, duration, userId } = req.body;
    const tenantId = req.tenantId;

    // Update plan usage
    await YogaPlan.findOneAndUpdate(
      { _id: planId, tenantId },
      {
        $inc: { 
          'usage.sessions_completed': 1,
          'usage.total_practice_time': duration
        },
        $set: {
          'usage.last_session_date': new Date()
        }
      }
    );

    // Update user progress
    await User.findOneAndUpdate(
      { _id: userId, tenantId },
      {
        $inc: {
          'progress.sessions_completed': 1,
          'progress.total_minutes': duration
        },
        $set: {
          'progress.last_session_date': new Date()
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'Session completed successfully' 
    });

  } catch (error) {
    console.error('Error updating session completion:', error);
    res.status(500).json({ error: 'Failed to update session completion' });
  }
});

module.exports = router;

// backend/api/services/aiService.js
const { Configuration, OpenAIApi } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize AI clients
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Yoga pose database (simplified)
const YOGA_POSES = {
  beginner: [
    {
      name: "Mountain Pose",
      sanskrit_name: "Tadasana",
      duration_seconds: 30,
      instructions: ["Stand tall with feet hip-width apart", "Engage core muscles", "Breathe deeply"],
      modifications: ["Use wall for support", "Sit in chair"],
      contraindications: ["Severe balance issues"],
      benefits: ["Improves posture", "Builds foundation"]
    },
    {
      name: "Child's Pose",
      sanskrit_name: "Balasana",
      duration_seconds: 60,
      instructions: ["Kneel on floor", "Sit back on heels", "Fold forward with arms extended"],
      modifications: ["Place pillow under knees", "Use bolster for support"],
      contraindications: ["Knee injuries", "Pregnancy (use wide-knee variation)"],
      benefits: ["Calms nervous system", "Stretches back"]
    },
    {
      name: "Cat-Cow Pose",
      sanskrit_name: "Marjaryasana-Bitilasana",
      duration_seconds: 45,
      instructions: ["Start on hands and knees", "Alternate arching and rounding spine"],
      modifications: ["Perform seated in chair", "Use forearms instead of hands"],
      contraindications: ["Severe wrist pain", "Neck injuries"],
      benefits: ["Improves spinal mobility", "Warms up the body"]
    }
  ],
  intermediate: [
    {
      name: "Warrior II",
      sanskrit_name: "Virabhadrasana II",
      duration_seconds: 45,
      instructions: ["Step feet wide apart", "Turn right foot out 90 degrees", "Bend right knee over ankle"],
      modifications: ["Use wall for back support", "Shorten stance"],
      contraindications: ["Hip injuries", "Knee problems"],
      benefits: ["Builds leg strength", "Improves stamina"]
    },
    {
      name: "Tree Pose",
      sanskrit_name: "Vrksasana",
      duration_seconds: 30,
      instructions: ["Stand on left foot", "Place right foot on inner left thigh", "Hands in prayer position"],
      modifications: ["Use wall for support", "Place foot on calf instead"],
      contraindications: ["Recent knee surgery", "Severe balance issues"],
      benefits: ["Improves balance", "Strengthens core"]
    }
  ],
  advanced: [
    {
      name: "Crow Pose",
      sanskrit_name: "Bakasana",
      duration_seconds: 20,
      instructions: ["Squat with hands on floor", "Lean forward and lift feet", "Balance on hands"],
      modifications: ["Use block under forehead", "Keep toes on ground"],
      contraindications: ["Wrist injuries", "Shoulder problems"],
      benefits: ["Builds arm strength", "Improves focus"]
    }
  ]
};

// AI Service Functions
async function generateYogaPlan(assessment, tenantId) {
  try {
    const startTime = Date.now();
    
    // Choose AI provider based on complexity
    const useAdvancedAI = assessment.injuries_limitations?.length > 0 || 
                         assessment.experience_level === 'advanced';
    
    let planStructure;
    let metadata;
    
    if (useAdvancedAI) {
      // Use Claude for complex personalization
      const result = await generateWithClaude(assessment);
      planStructure = result.planStructure;
      metadata = result.metadata;
    } else {
      // Use local generation for basic plans
      planStructure = generateBasicPlan(assessment);
      metadata = {
        model_used: 'local_generation',
        confidence_score: 0.85,
        generation_time_ms: Date.now() - startTime,
        tokens_consumed: 0,
        prompt_version: '1.0',
        safety_checks_passed: true
      };
    }
    
    return {
      planStructure,
      metadata: {
        ...metadata,
        generation_time_ms: Date.now() - startTime,
        tenant_id: tenantId
      }
    };
    
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error(`Plan generation failed: ${error.message}`);
  }
}

async function generateWithClaude(assessment) {
  const prompt = createYogaPlanPrompt(assessment);
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const planData = JSON.parse(response.content[0].text);
    
    return {
      planStructure: planData,
      metadata: {
        model_used: 'claude-3-haiku',
        confidence_score: 0.92,
        tokens_consumed: response.usage?.input_tokens + response.usage?.output_tokens,
        prompt_version: '2.0',
        safety_checks_passed: validatePlanSafety(planData, assessment)
      }
    };
    
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('AI service temporarily unavailable');
  }
}

function createYogaPlanPrompt(assessment) {
  return `Create a personalized yoga plan based on this assessment:

Experience Level: ${assessment.experience_level}
Primary Goals: ${assessment.primary_goals.join(', ')}
Preferred Styles: ${assessment.preferred_styles.join(', ')}
Session Duration: ${assessment.session_duration} minutes
Sessions Per Week: ${assessment.sessions_per_week}
Injuries/Limitations: ${assessment.injuries_limitations.map(i => `${i.type} (${i.severity})`).join(', ')}

Requirements:
1. Create a ${assessment.duration_weeks || 8}-week progressive program
2. Include ${assessment.sessions_per_week} sessions per week
3. Each session should be approximately ${assessment.session_duration} minutes
4. Always include warm-up (5-8 minutes), main sequence, and cool-down (5-8 minutes)
5. Consider all injuries and limitations - NEVER include contraindicated poses
6. Provide clear modifications for each pose
7. Include Sanskrit names and English translations
8. Specify duration in seconds or breath counts for each pose

Safety Guidelines:
- For injuries, modify or exclude problematic poses
- Progress gradually week by week
- Include rest days between sessions
- Add meditation/breathing exercises for stress relief goals

Return ONLY valid JSON in this exact format:
{
  "duration_weeks": 8,
  "sessions_per_week": 3,
  "difficulty_level": "beginner|intermediate|advanced",
  "total_sessions": 24,
  "weeks": [
    {
      "week_number": 1,
      "theme": "Foundation Building",
      "focus_areas": ["alignment", "breathing"],
      "sessions": [
        {
          "session_number": 1,
          "duration_minutes": 30,
          "warm_up": {
            "duration_minutes": 5,
            "poses": [
              {
                "name": "Cat-Cow Pose",
                "sanskrit_name": "Marjaryasana-Bitilasana",
                "duration_seconds": 45,
                "instructions": ["Start on hands and knees", "Alternate arching and rounding spine"],
                "modifications": ["Use forearms if wrists hurt"],
                "contraindications": ["Wrist injuries"],
                "benefits": ["Warms spine", "Improves mobility"]
              }
            ]
          },
          "main_sequence": {
            "duration_minutes": 20,
            "poses": [...]
          },
          "cool_down": {
            "duration_minutes": 5,
            "poses": [...]
          }
        }
      ]
    }
  ]
}`;
}

function generateBasicPlan(assessment) {
  const { experience_level, sessions_per_week, session_duration } = assessment;
  const duration_weeks = 8;
  
  // Select appropriate poses based on experience level
  const availablePoses = YOGA_POSES[experience_level] || YOGA_POSES.beginner;
  
  const weeks = [];
  
  for (let week = 1; week <= duration_weeks; week++) {
    const sessions = [];
    
    for (let session = 1; session <= sessions_per_week; session++) {
      const sessionPoses = selectPosesForSession(availablePoses, session_duration);
      
      sessions.push({
        session_number: session,
        duration_minutes: session_duration,
        warm_up: {
          duration_minutes: Math.min(8, Math.floor(session_duration * 0.25)),
          poses: sessionPoses.warmUp
        },
        main_sequence: {
          duration_minutes: Math.floor(session_duration * 0.6),
          poses: sessionPoses.main
        },
        cool_down: {
          duration_minutes: Math.min(8, Math.floor(session_duration * 0.25)),
          poses: sessionPoses.coolDown
        }
      });
    }
    
    weeks.push({
      week_number: week,
      theme: getWeekTheme(week, experience_level),
      focus_areas: getWeekFocus(week, assessment.primary_goals),
      sessions
    });
  }
  
  return {
    duration_weeks,
    sessions_per_week,
    difficulty_level: experience_level,
    total_sessions: duration_weeks * sessions_per_week,
    weeks
  };
}

function selectPosesForSession(availablePoses, duration) {
  // Simple pose selection logic
  const warmUpPoses = availablePoses.filter(pose => 
    pose.benefits.some(benefit => benefit.includes('warm') || benefit.includes('mobility'))
  ).slice(0, 2);
  
  const mainPoses = availablePoses.slice(0, Math.floor(duration / 10));
  
  const coolDownPoses = [
    {
      name: "Child's Pose",
      sanskrit_name: "Balasana",
      duration_seconds: 60,
      instructions: ["Kneel and fold forward", "Rest forehead on ground"],
      modifications: ["Use pillow under forehead"],
      contraindications: ["Knee injuries"],
      benefits: ["Relaxes nervous system"]
    }
  ];
  
  return {
    warmUp: warmUpPoses,
    main: mainPoses,
    coolDown: coolDownPoses
  };
}

function getWeekTheme(weekNumber, experienceLevel) {
  const themes = {
    beginner: [
      "Foundation & Alignment", "Building Strength", "Improving Flexibility",
      "Balance & Stability", "Breath Awareness", "Flow Introduction",
      "Integration", "Personal Practice"
    ],
    intermediate: [
      "Strength Building", "Advanced Poses", "Flow Mastery",
      "Arm Balances", "Backbends", "Inversions",
      "Meditation Focus", "Complete Integration"
    ],
    advanced: [
      "Advanced Sequencing", "Peak Poses", "Challenging Flows",
      "Advanced Inversions", "Deep Backbends", "Arm Balance Mastery",
      "Pranayama Practice", "Teaching Preparation"
    ]
  };
  
  return themes[experienceLevel][weekNumber - 1] || "Progressive Practice";
}

function getWeekFocus(weekNumber, primaryGoals) {
  const focusMap = {
    1: ["alignment", "breathing"],
    2: ["strength", "stability"],
    3: ["flexibility", "flow"],
    4: ["balance", "coordination"],
    5: ["endurance", "focus"],
    6: ["integration", "mindfulness"],
    7: ["challenging poses", "confidence"],
    8: ["personal practice", "reflection"]
  };
  
  return focusMap[weekNumber] || ["general practice"];
}

function validatePlanSafety(planData, assessment) {
  // Basic safety validation
  const hasInjuries = assessment.injuries_limitations?.length > 0;
  
  if (hasInjuries) {
    // Check if any contraindicated poses are included
    for (const week of planData.weeks) {
      for (const session of week.sessions) {
        const allPoses = [
          ...session.warm_up.poses,
          ...session.main_sequence.poses,
          ...session.cool_down.poses
        ];
        
        for (const pose of allPoses) {
          if (pose.contraindications) {
            for (const injury of assessment.injuries_limitations) {
              if (pose.contraindications.some(contra => 
                contra.toLowerCase().includes(injury.type.toLowerCase())
              )) {
                console.warn(`Potential safety issue: ${pose.name} contraindicated for ${injury.type}`);
                return false;
              }
            }
          }
        }
      }
    }
  }
  
  return true;
}

module.exports = {
  generateYogaPlan,
  generateWithClaude,
  generateBasicPlan,
  validatePlanSafety
};

// backend/api/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../database/models/User');
const { decodeWixInstance } = require('../utils/wixAuth');

// Wix user authentication
router.post('/wix-login', async (req, res) => {
  try {
    const { wixUserId, wixInstanceId, siteId } = req.body;
    
    if (!wixUserId || !siteId) {
      return res.status(400).json({ error: 'Wix user ID and site ID required' });
    }
    
    // Find or create user
    let user = await User.findOne({
      tenantId: siteId,
      wixUserId: wixUserId
    });
    
    if (!user) {
      // Create new user from Wix data
      user = new User({
        tenantId: siteId,
        wixUserId: wixUserId,
        name: req.body.name || 'Wix User',
        email: req.body.email || `${wixUserId}@temp.com`,
        role: 'member'
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        tenantId: siteId, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      tenant: siteId
    });
    
  } catch (error) {
    console.error('Wix auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Regular email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;
    
    if (!email || !password || !tenantId) {
      return res.status(400).json({ error: 'Email, password, and tenant ID required' });
    }
    
    const user = await User.findOne({ tenantId, email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, tenantId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      tenant: tenantId
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tenant: decoded.tenantId
    });
    
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

module.exports = router;