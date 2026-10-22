const express = require('express');
const router = express.Router();
const {
  processVoiceCommand,
  getVoicePrompts,
  executeHandsFreeAction,
} = require('../controllers/voiceAssistantController');

// Voice assistant endpoint (accessible to guests and authenticated customers)
router.post(['/voice-assistant', '/voice/parse-intent', '/voice/query'], processVoiceCommand);
router.get(['/voice-prompts', '/voice/prompts'], getVoicePrompts);
router.post('/voice/hands-free-action', executeHandsFreeAction);

module.exports = router;
