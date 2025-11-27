const express = require('express');
const mentalHealthController = require('../controllers/mentalHealthController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.post('/sessions', authenticate, mentalHealthController.schedule);
router.get('/sessions', authenticate, mentalHealthController.getAll);

module.exports = router;
