const pool = require('../config/database');

// Create alert
exports.create = async (req, res) => {
  try {
    const { type, message, region, severity, source } = req.body;

    // Validate required fields
    if (!message || !type) {
      return res.status(400).json({ error: 'Message and type are required' });
    }

    // Set source to the authenticated user if not provided
    const alertSource = source || (req.user ? `admin_${req.user.id}` : 'system');

    const [result] = await pool.execute(
      `INSERT INTO alerts (type, message, region, severity, source) 
       VALUES (?, ?, ?, ?, ?)`,
      [type, message, region, severity, alertSource]
    );

    res.status(201).json({ 
      message: 'Alert created',
      alertId: result.insertId 
    });
  } catch (err) {
    console.error('Alert creation error:', err);
    res.status(500).json({ error: 'Failed to create alert', details: err.message });
  }
};

// Get alerts
exports.getAll = async (req, res) => {
  try {
    const { region, severity } = req.query;
    
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [alerts] = await pool.execute(query, params);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
};
