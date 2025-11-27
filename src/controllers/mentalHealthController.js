const pool = require('../config/database');

// Schedule mental health session
exports.schedule = async (req, res) => {
  try {
    const { counselor_id, session_date, mode, notes } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO mental_health_sessions (user_id, counselor_id, session_date, mode, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, counselor_id, session_date, mode, notes]
    );

    res.status(201).json({ 
      message: 'Session scheduled',
      sessionId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule session', details: err.message });
  }
};

// Get user's mental health sessions
exports.getAll = async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      `SELECT mhs.*, u.full_name as counselor_name 
       FROM mental_health_sessions mhs 
       LEFT JOIN users u ON mhs.counselor_id = u.id 
       WHERE mhs.user_id = ? 
       ORDER BY mhs.session_date DESC`,
      [req.user.id]
    );

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
};
