const express = require('express');
const equipmentRequestController = require('../controllers/equipmentRequestController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// NGO routes - get own equipment requests
router.get('/', authenticate, equipmentRequestController.getByNGO);

// NGO routes - create equipment request
router.post('/', authenticate, equipmentRequestController.create);

// NGO routes - update own request status
router.patch('/:id', authenticate, equipmentRequestController.updateStatus);

// Admin route - get all equipment requests
router.get('/admin/all', authenticate, authorize('admin'), equipmentRequestController.getAll);

module.exports = router;
