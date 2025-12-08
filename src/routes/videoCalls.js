const express = require('express');
const videoCallController = require('../controllers/videoCallController');
const authenticate = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Protected routes
router.post('/:id/video-calls', authenticate, videoCallController.startCall);
router.get('/:id/video-calls', authenticate, videoCallController.getAllCalls);
router.patch('/:id/video-calls/end', authenticate, videoCallController.endCall);

module.exports = router;
