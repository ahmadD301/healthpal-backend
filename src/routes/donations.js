const express = require('express');
const donationController = require('../controllers/donationController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Create a donation (donor makes a payment)
router.post('/', authenticate, authorize('donor'), donationController.createDonation);

// Get donation history for the logged-in donor
router.get('/history', authenticate, authorize('donor'), donationController.getDonationHistory);

// Get all donations for a specific sponsorship
router.get('/sponsorship/:sponsorshipId', authenticate, donationController.getSponsorshipDonations);

// Get donation statistics
router.get('/stats', authenticate, donationController.getDonationStats);

module.exports = router;
