/**
 * Advanced Search Service
 * Provides comprehensive search across doctors, NGOs, consultations, and health guides
 * Supports filters, sorting, and full-text search
 */

const mysql = require('mysql2/promise');

class SearchService {
  constructor() {
    this.pool = null;
  }

  /**
   * Search for doctors with advanced filters
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of matching doctors
   */
  async searchDoctors(criteria = {}) {
    try {
      const {
        specialty,
        location,
        min_rating = 0,
        max_fee = 10000,
        available = true,
        search_term = '',
        limit = 20,
        offset = 0,
        sort_by = 'rating'
      } = criteria;

      let query = `
        SELECT 
          u.id, u.full_name, u.email, u.phone,
          dp.specialty, dp.license_no, dp.experience_years, 
          dp.consultation_fee, dp.available,
          dp.rating, dp.reviews_count,
          COUNT(c.id) as consultation_count
        FROM users u
        JOIN doctor_profiles dp ON u.id = dp.user_id
        LEFT JOIN consultations c ON dp.user_id = c.doctor_id AND c.status = 'completed'
        WHERE u.role = 'doctor' AND dp.available = 1
      `;

      const params = [];

      // Filter by specialty
      if (specialty) {
        query += ' AND dp.specialty LIKE ?';
        params.push(`%${specialty}%`);
      }

      // Filter by location
      if (location) {
        query += ' AND u.location LIKE ?';
        params.push(`%${location}%`);
      }

      // Filter by rating
      if (min_rating > 0) {
        query += ' AND dp.rating >= ?';
        params.push(min_rating);
      }

      // Filter by fee
      query += ' AND dp.consultation_fee <= ?';
      params.push(max_fee);

      // Full-text search on name or specialty
      if (search_term) {
        query += ' AND (u.full_name LIKE ? OR dp.specialty LIKE ? OR u.email LIKE ?)';
        params.push(`%${search_term}%`, `%${search_term}%`, `%${search_term}%`);
      }

      query += ' GROUP BY u.id';

      // Sorting
      const validSortFields = ['rating', 'consultation_fee', 'experience_years', 'consultation_count'];
      if (validSortFields.includes(sort_by)) {
        query += ` ORDER BY dp.${sort_by} DESC`;
      } else {
        query += ` ORDER BY dp.rating DESC`;
      }

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });

      const [results] = await connection.execute(query, params);
      await connection.end();

      return results;
    } catch (error) {
      console.error('Doctor search error:', error);
      throw error;
    }
  }

  /**
   * Search for NGOs with filters
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of matching NGOs
   */
  async searchNGOs(criteria = {}) {
    try {
      const {
        specialty = '',
        location = '',
        search_term = '',
        verified = true,
        limit = 20,
        offset = 0
      } = criteria;

      let query = `
        SELECT 
          u.id, u.full_name, u.email, u.phone, u.location,
          np.organization_name, np.specialty, np.verified,
          COUNT(nm.id) as mission_count,
          COUNT(DISTINCT c.id) as consultation_count
        FROM users u
        JOIN ngo_profiles np ON u.id = np.user_id
        LEFT JOIN ngo_missions nm ON np.user_id = nm.ngo_id
        LEFT JOIN consultations c ON np.user_id = c.doctor_id
        WHERE u.role = 'ngo'
      `;

      const params = [];

      // Filter by verified status
      if (verified) {
        query += ' AND np.verified = 1';
      }

      // Filter by specialty
      if (specialty) {
        query += ' AND np.specialty LIKE ?';
        params.push(`%${specialty}%`);
      }

      // Filter by location
      if (location) {
        query += ' AND u.location LIKE ?';
        params.push(`%${location}%`);
      }

      // Full-text search
      if (search_term) {
        query += ' AND (np.organization_name LIKE ? OR np.specialty LIKE ? OR u.email LIKE ?)';
        params.push(`%${search_term}%`, `%${search_term}%`, `%${search_term}%`);
      }

      query += ' GROUP BY u.id ORDER BY np.verified DESC, u.full_name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });

      const [results] = await connection.execute(query, params);
      await connection.end();

      return results;
    } catch (error) {
      console.error('NGO search error:', error);
      throw error;
    }
  }

  /**
   * Search consultations with filters
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of matching consultations
   */
  async searchConsultations(criteria = {}) {
    try {
      const {
        user_id,
        status = '',
        mode = '',
        from_date = '',
        to_date = '',
        limit = 20,
        offset = 0,
        sort_by = 'date_desc'
      } = criteria;

      let query = `
        SELECT 
          c.id, c.patient_id, c.doctor_id, c.consultation_date,
          c.mode, c.status, c.notes,
          p.full_name as patient_name, d.full_name as doctor_name,
          COUNT(m.id) as message_count
        FROM consultations c
        JOIN users p ON c.patient_id = p.id
        JOIN users d ON c.doctor_id = d.id
        LEFT JOIN messages m ON c.id = m.consultation_id
        WHERE 1=1
      `;

      const params = [];

      // Filter by user
      if (user_id) {
        query += ' AND (c.patient_id = ? OR c.doctor_id = ?)';
        params.push(user_id, user_id);
      }

      // Filter by status
      if (status) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      // Filter by mode
      if (mode) {
        query += ' AND c.mode = ?';
        params.push(mode);
      }

      // Filter by date range
      if (from_date) {
        query += ' AND c.consultation_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND c.consultation_date <= ?';
        params.push(to_date);
      }

      query += ' GROUP BY c.id';

      // Sorting
      if (sort_by === 'date_asc') {
        query += ' ORDER BY c.consultation_date ASC';
      } else {
        query += ' ORDER BY c.consultation_date DESC';
      }

      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });

      const [results] = await connection.execute(query, params);
      await connection.end();

      return results;
    } catch (error) {
      console.error('Consultation search error:', error);
      throw error;
    }
  }

  /**
   * Search health guides and articles
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} - Array of matching guides
   */
  async searchHealthGuides(criteria = {}) {
    try {
      const {
        category = '',
        search_term = '',
        language = 'ar',
        limit = 20,
        offset = 0
      } = criteria;

      let query = `
        SELECT 
          id, title, description, category, 
          content_url, created_by, created_at,
          view_count
        FROM health_guides
        WHERE 1=1
      `;

      const params = [];

      // Filter by category
      if (category) {
        query += ' AND category LIKE ?';
        params.push(`%${category}%`);
      }

      // Full-text search on title and description
      if (search_term) {
        query += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
        params.push(`%${search_term}%`, `%${search_term}%`, `%${search_term}%`);
      }

      query += ' ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      });

      const [results] = await connection.execute(query, params);
      await connection.end();

      return results;
    } catch (error) {
      console.error('Health guides search error:', error);
      throw error;
    }
  }

  /**
   * Global search across all entities
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} - Search results
   */
  async globalSearch(criteria = {}) {
    try {
      const { search_term = '', limit = 10 } = criteria;

      if (!search_term || search_term.length < 2) {
        return {
          doctors: [],
          ngos: [],
          guides: [],
          total_results: 0
        };
      }

      const [doctors, ngos, guides] = await Promise.all([
        this.searchDoctors({ search_term, limit }),
        this.searchNGOs({ search_term, limit }),
        this.searchHealthGuides({ search_term, limit })
      ]);

      return {
        doctors: doctors.map(d => ({ ...d, type: 'doctor' })),
        ngos: ngos.map(n => ({ ...n, type: 'ngo' })),
        guides: guides.map(g => ({ ...g, type: 'guide' })),
        total_results: doctors.length + ngos.length + guides.length,
        search_term
      };
    } catch (error) {
      console.error('Global search error:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();
