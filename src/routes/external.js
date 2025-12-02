const express = require('express');
const externalApiController = require('../controllers/externalApiController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// Public routes
router.get('/disease-outbreaks', externalApiController.getDiseaseOutbreaks);

// Protected routes
router.get('/medicine-info/:name', authenticate, externalApiController.getMedicineInfo);
router.get('/who-health-data', authenticate, externalApiController.getWHOHealthData);

// ==================== WEBHOOK ENDPOINTS ====================

// Stripe webhook (no auth required, signature verified)
router.post('/webhooks/stripe', externalApiController.stripeWebhook);

// ==================== TESTING ENDPOINTS (Admin) ====================

// Test notification systems
router.post('/test/email', authenticate, authorize('admin'), externalApiController.testEmail);
router.post('/test/sms', authenticate, authorize('admin'), externalApiController.testSMS);
router.post('/send/test-email', authenticate, authorize('admin'), externalApiController.sendTestEmail);
router.post('/send/test-sms', authenticate, authorize('admin'), externalApiController.sendTestSMS);

module.exports = router;
