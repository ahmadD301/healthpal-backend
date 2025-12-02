const pool = require('../config/database');

// List equipment
exports.create = async (req, res) => {
  try {
    const { item_name, description, quantity, location } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO equipment_registry (item_name, description, quantity, location, listed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [item_name, description, quantity, location, req.user.id]
    );

    res.status(201).json({ 
      message: 'Equipment listed successfully',
      equipmentId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list equipment', details: err.message });
  }
};

// Get available equipment
exports.getAll = async (req, res) => {
  try {
    const { location } = req.query;
    
    let query = `
      SELECT e.*, u.full_name as listed_by_name 
      FROM equipment_registry e 
      LEFT JOIN users u ON e.listed_by = u.id 
      WHERE e.available = TRUE
    `;
    const params = [];

    if (location) {
      query += ' AND e.location LIKE ?';
      params.push(`%${location}%`);
    }

    const [equipment] = await pool.execute(query, params);
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment', details: err.message });
  }
};
