const pool = require('../config/database');

// Create health guide
exports.create = async (req, res) => {
  try {
    const { title, description, category, language } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO health_guides (title, description, category, language, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, category, language, req.user.id]
    );

    res.status(201).json({ 
      message: 'Health guide created',
      guideId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create guide', details: err.message });
  }
};

// Get health guides
exports.getAll = async (req, res) => {
  try {
    const { category, language } = req.query;
    
    let query = 'SELECT * FROM health_guides WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    query += ' ORDER BY created_at DESC';

    const [guides] = await pool.execute(query, params);
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guides', details: err.message });
  }
};
