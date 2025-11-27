const express = require('express');
const patientController = require('../controllers/patientController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.get('/:id', authenticate, patientController.getProfile);
router.post('/profile', authenticate, authorize('patient'), patientController.saveProfile);

module.exports = router;
