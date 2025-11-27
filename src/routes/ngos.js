const express = require('express');
const ngoController = require('../controllers/ngoController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('admin'), ngoController.register);
router.get('/', authenticate, ngoController.getAll);
router.post('/missions', authenticate, authorize('ngo', 'admin'), ngoController.createMission);
router.get('/missions', authenticate, ngoController.getMissions);

module.exports = router;
