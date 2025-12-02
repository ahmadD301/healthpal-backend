const express = require('express');
const alertController = require('../controllers/alertController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('admin'), alertController.create);
router.get('/', alertController.getAll); // Public

module.exports = router;
