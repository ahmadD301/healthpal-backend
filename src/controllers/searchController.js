/**
 * Search API Controller
 * Handles all search requests
 */

const searchService = require('../utils/searchService');

/**
 * POST /api/search
 * Global search across all entities
 */
exports.globalSearch = async (req, res) => {
  try {
    const { search_term, limit = 10 } = req.body;

    if (!search_term || search_term.trim().length < 2) {
      return res.status(400).json({
        error: 'Search term must be at least 2 characters'
      });
    }

    const results = await searchService.globalSearch({
      search_term: search_term.trim(),
      limit: Math.min(limit, 50)
    });

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
};

/**
 * POST /api/search/doctors
 * Search for doctors with advanced filters
 */
exports.searchDoctors = async (req, res) => {
  try {
    const {
      specialty,
      location,
      min_rating = 0,
      max_fee = 10000,
      search_term = '',
      limit = 20,
      offset = 0,
      sort_by = 'rating'
    } = req.body;

    const doctors = await searchService.searchDoctors({
      specialty,
      location,
      min_rating,
      max_fee,
      search_term: search_term.trim(),
      limit: Math.min(limit, 100),
      offset,
      sort_by
    });

    res.json({
      success: true,
      doctors,
      count: doctors.length,
      filters: {
        specialty,
        location,
        min_rating,
        max_fee,
        sort_by
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Doctor search failed',
      details: error.message
    });
  }
};

/**
 * POST /api/search/ngos
 * Search for NGOs with filters
 */
exports.searchNGOs = async (req, res) => {
  try {
    const {
      specialty = '',
      location = '',
      search_term = '',
      verified = true,
      limit = 20,
      offset = 0
    } = req.body;

    const ngos = await searchService.searchNGOs({
      specialty,
      location,
      search_term: search_term.trim(),
      verified,
      limit: Math.min(limit, 100),
      offset
    });

    res.json({
      success: true,
      ngos,
      count: ngos.length,
      filters: {
        specialty,
        location,
        verified
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'NGO search failed',
      details: error.message
    });
  }
};

/**
 * POST /api/search/consultations
 * Search consultations with filters
 */
exports.searchConsultations = async (req, res) => {
  try {
    const {
      user_id = req.user.id,
      status = '',
      mode = '',
      from_date = '',
      to_date = '',
      limit = 20,
      offset = 0,
      sort_by = 'date_desc'
    } = req.body;

    const consultations = await searchService.searchConsultations({
      user_id,
      status,
      mode,
      from_date,
      to_date,
      limit: Math.min(limit, 100),
      offset,
      sort_by
    });

    res.json({
      success: true,
      consultations,
      count: consultations.length,
      filters: {
        status,
        mode,
        from_date,
        to_date,
        sort_by
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Consultation search failed',
      details: error.message
    });
  }
};

/**
 * POST /api/search/guides
 * Search health guides
 */
exports.searchHealthGuides = async (req, res) => {
  try {
    const {
      category = '',
      search_term = '',
      language = 'ar',
      limit = 20,
      offset = 0
    } = req.body;

    const guides = await searchService.searchHealthGuides({
      category,
      search_term: search_term.trim(),
      language,
      limit: Math.min(limit, 100),
      offset
    });

    res.json({
      success: true,
      guides,
      count: guides.length,
      filters: {
        category,
        language
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Health guides search failed',
      details: error.message
    });
  }
};

/**
 * GET /api/search/suggestions
 * Get search suggestions based on popular queries
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { term = '' } = req.query;

    // Popular specialties
    const specialties = [
      'General Practice',
      'Pediatrics',
      'Cardiology',
      'Orthopedics',
      'Dermatology',
      'Neurology',
      'Psychiatry',
      'Mental Health'
    ];

    // Popular categories
    const categories = [
      'First Aid',
      'Nutrition',
      'Chronic Disease',
      'Maternal Health',
      'Child Health',
      'Mental Health'
    ];

    const suggestions = {
      specialties: specialties.filter(s => 
        s.toLowerCase().includes(term.toLowerCase())
      ),
      categories: categories.filter(c => 
        c.toLowerCase().includes(term.toLowerCase())
      )
    };

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch suggestions',
      details: error.message
    });
  }
};
