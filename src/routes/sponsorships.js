const express = require('express');
const sponsorshipController = require('../controllers/sponsorshipController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('patient'), sponsorshipController.create);
router.get('/', authenticate, sponsorshipController.getAll);
router.post('/:id/donate', authenticate, authorize('donor'), sponsorshipController.donate);

module.exports = router;
