const express = require('express');
const ngoController = require('../controllers/ngoController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('admin'), ngoController.register);
router.get('/', authenticate, ngoController.getAll);
router.get('/pending', authenticate, authorize('admin'), ngoController.getPending);
router.patch('/approve', authenticate, authorize('admin'), ngoController.approve);
router.patch('/reject', authenticate, authorize('admin'), ngoController.reject);

// Mission routes - specific routes BEFORE parameterized routes
router.post('/missions', authenticate, authorize('ngo', 'admin'), ngoController.createMission);
router.get('/missions/my', authenticate, authorize('ngo'), ngoController.getMyMissions);
router.get('/missions', authenticate, ngoController.getMissions);
router.patch('/missions/:id', authenticate, authorize('ngo'), ngoController.updateMission);

module.exports = router;
