const express = require('express');
const healthGuideController = require('../controllers/healthGuideController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('doctor', 'admin'), healthGuideController.create);
router.get('/', healthGuideController.getAll); // Public

module.exports = router;
