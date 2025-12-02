const express = require('express');
const sponsorshipController = require('../controllers/sponsorshipController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Protected routes
router.post('/', authenticate, authorize('patient'), sponsorshipController.create);
router.get('/', authenticate, sponsorshipController.getAll);
router.get('/:id', authenticate, sponsorshipController.getById);

// Payment processing
router.post('/:id/payment/initiate', authenticate, authorize('donor'), sponsorshipController.initiatePayment);
router.post('/:id/payment/confirm', authenticate, authorize('donor'), sponsorshipController.confirmDonation);

// Legacy endpoint
router.post('/:id/donate', authenticate, authorize('donor'), sponsorshipController.donate);

module.exports = router;
