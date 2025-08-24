const express = require('express');
const router = express.Router();
const User = require('../../database/models/User');

// Get user progress
router.get('/:userId/progress', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenantId;

    const user = await User.findOne({ _id: userId, tenantId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      sessions_completed: user.progress?.sessions_completed || 0,
      total_minutes: user.progress?.total_minutes || 0,
      current_streak: user.progress?.current_streak || 0,
      longest_streak: user.progress?.longest_streak || 0,
      last_session_date: user.progress?.last_session_date,
      achievements: user.progress?.achievements || []
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

// Update user profile
router.patch('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenantId;
    const updates = req.body;

    const user = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;