const express = require('express');
const messageController = require('../controllers/messageController');
const authenticate = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Protected routes
router.post('/:id/messages', authenticate, messageController.send);
router.get('/:id/messages', authenticate, messageController.getAll);

module.exports = router;
