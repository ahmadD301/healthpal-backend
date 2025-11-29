const express = require('express');
const medicineController = require('../controllers/medicineController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('patient'), medicineController.create);
router.get('/', authenticate, medicineController.getAll);
router.patch('/:id/status', authenticate, medicineController.updateStatus);

module.exports = router;
