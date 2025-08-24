// backend/api/routes/yoga-plans.js
const express = require('express');
const router = express.Router();
const YogaPlan = require('../../database/models/YogaPlan');
const User = require('../../database/models/User');
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
