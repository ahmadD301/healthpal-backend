const pool = require('../config/database');

// Create medicine request
exports.create = async (req, res) => {
  try {
    const { medicine_name, quantity, urgency } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO medicine_requests (patient_id, medicine_name, quantity, urgency) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, medicine_name, quantity, urgency]
    );

    res.status(201).json({ 
      message: 'Medicine request created',
      requestId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Request failed', details: err.message });
  }
};

// Get medicine requests
exports.getAll = async (req, res) => {
  try {
    const { status, urgency } = req.query;
    
    let query = `
      SELECT mr.*, u.full_name as patient_name, p.location 
      FROM medicine_requests mr 
      JOIN users u ON mr.patient_id = u.id 
      LEFT JOIN patient_profiles p ON mr.patient_id = p.user_id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND mr.status = ?';
      params.push(status);
    }

    if (urgency) {
      query += ' AND mr.urgency = ?';
      params.push(urgency);
    }

    query += ' ORDER BY mr.urgency DESC, mr.request_date DESC';

    const [requests] = await pool.execute(query, params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
};

// Update request status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    await pool.execute(
      'UPDATE medicine_requests SET status = ? WHERE id = ?',
      [status, requestId]
    );

    res.json({ message: 'Request status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};
