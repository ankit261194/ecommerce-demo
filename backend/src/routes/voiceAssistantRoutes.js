const express = require('express');
const router = express.Router();
const {
  processVoiceCommand,
  getVoicePrompts,
} = require('../controllers/voiceAssistantController');

// Voice assistant endpoint (accessible to guests and authenticated customers)
router.post('/voice-assistant', processVoiceCommand);
router.get('/voice-prompts', getVoicePrompts);

module.exports = router;
