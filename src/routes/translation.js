/**
 * Translation Routes
 * Endpoints for medical translation services
 */

const express = require('express');
const translationController = require('../controllers/translationController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Public endpoints
router.get('/supported-languages', translationController.getSupportedLanguages);
router.get('/health', translationController.healthCheck);

// Protected endpoints (require authentication)
router.post('/text', authenticate, translationController.translateText);
router.post('/message', authenticate, translationController.translateMessage);
router.post('/detect-language', authenticate, translationController.detectLanguage);
router.post('/auto', authenticate, translationController.autoTranslate);

module.exports = router;
