const express = require('express');
const router = express.Router();

// Get Wix site members
router.get('/members', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    // In production, this would integrate with Wix API
    // For now, return mock data
    res.json([
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
    ]);
  } catch (error) {
    console.error('Error fetching Wix members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Sync user data with Wix
router.post('/sync-user', async (req, res) => {
  try {
    const { wixInstanceId, userData } = req.body;
    
    // In production, this would sync with Wix
    // For now, just return success
    res.json({ success: true, message: 'User synced with Wix' });
  } catch (error) {
    console.error('Error syncing with Wix:', error);
    res.status(500).json({ error: 'Failed to sync with Wix' });
  }
});

module.exports = router;