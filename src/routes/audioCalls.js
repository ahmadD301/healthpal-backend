const express = require('express');
const audioCallController = require('../controllers/audioCallController');
const authenticate = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Protected routes
router.post('/:id/audio-calls', authenticate, audioCallController.startCall);
router.get('/:id/audio-calls', authenticate, audioCallController.getAllCalls);
router.patch('/:id/audio-calls/end', authenticate, audioCallController.endCall);

module.exports = router;
