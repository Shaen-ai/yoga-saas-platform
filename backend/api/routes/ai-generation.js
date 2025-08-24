const express = require('express');
const router = express.Router();

// Generate yoga plan using AI
router.post('/generate-plan', async (req, res) => {
  try {
    const { assessment } = req.body;
    const tenantId = req.tenantId;
    
    // Here you would call your AI service (Claude, GPT-4, or Gemini)
    // For now, return a mock response
    const aiGeneratedPlan = {
      title: 'AI-Generated Yoga Journey',
      description: 'A personalized yoga plan created by AI',
      duration_weeks: assessment.duration_weeks || 4,
      sessions_per_week: assessment.sessions_per_week || 3,
      difficulty_level: assessment.experience_level || 'beginner',
      poses: [
        { name: 'Mountain Pose', duration_seconds: 60 },
        { name: 'Downward Dog', duration_seconds: 45 },
        { name: 'Warrior I', duration_seconds: 30 }
      ]
    };

    res.json(aiGeneratedPlan);
  } catch (error) {
    console.error('Error generating AI plan:', error);
    res.status(500).json({ error: 'Failed to generate AI plan' });
  }
});

module.exports = router;