const express = require('express');
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.get('/', authenticate, doctorController.getAll);
router.post('/profile', authenticate, authorize('doctor'), doctorController.saveProfile);

module.exports = router;
