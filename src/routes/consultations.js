const express = require('express');
const consultationController = require('../controllers/consultationController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes - Consultations
router.post('/', authenticate, authorize('patient'), consultationController.book);
router.get('/', authenticate, consultationController.getAll);
router.patch('/:id/status', authenticate, consultationController.updateStatus);

module.exports = router;
