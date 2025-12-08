/**
 * Search Routes
 * Advanced search and filtering endpoints
 */

const express = require('express');
const searchController = require('../controllers/searchController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Global search (public)
router.post('/', authenticate, searchController.globalSearch);

// Specific search endpoints
router.post('/doctors', authenticate, searchController.searchDoctors);
router.post('/ngos', authenticate, searchController.searchNGOs);
router.post('/consultations', authenticate, searchController.searchConsultations);
router.post('/guides', authenticate, searchController.searchHealthGuides);

// Search suggestions (public)
router.get('/suggestions', searchController.getSearchSuggestions);

module.exports = router;
