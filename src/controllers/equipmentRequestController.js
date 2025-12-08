const pool = require('../config/database');

/**
 * Get all equipment requests for NGO
 */
exports.getByNGO = async (req, res) => {
  try {
    const ngo_id = req.user.id;

    const [requests] = await pool.execute(
      `SELECT id, item_name, quantity, purpose, status, requested_at
       FROM equipment_requests
       WHERE ngo_id = ?
       ORDER BY requested_at DESC`,
      [ngo_id]
    );

    res.json(requests);
  } catch (err) {
    console.error('Error fetching equipment requests:', err);
    res.status(500).json({ error: 'Failed to fetch equipment requests', details: err.message });
  }
};

/**
 * Create equipment request
 */
exports.create = async (req, res) => {
  try {
    const ngo_id = req.user.id;
    const { item_name, quantity, purpose } = req.body;

    if (!item_name || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: item_name, quantity' });
    }

    const [result] = await pool.execute(
      `INSERT INTO equipment_requests (ngo_id, item_name, quantity, purpose, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [ngo_id, item_name, quantity, purpose || null]
    );

    res.status(201).json({
      message: 'Equipment request created successfully',
      requestId: result.insertId
    });
  } catch (err) {
    console.error('Error creating equipment request:', err);
    res.status(500).json({ error: 'Failed to create equipment request', details: err.message });
  }
};

/**
 * Update equipment request status
 */
exports.updateStatus = async (req, res) => {
  try {
    const ngo_id = req.user.id;
    const request_id = req.params.id;
    const { status } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.execute(
      `UPDATE equipment_requests SET status = ? WHERE id = ? AND ngo_id = ?`,
      [status, request_id, ngo_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment request not found' });
    }

    res.json({ message: 'Equipment request updated successfully' });
  } catch (err) {
    console.error('Error updating equipment request:', err);
    res.status(500).json({ error: 'Failed to update equipment request', details: err.message });
  }
};

/**
 * Get all equipment requests (admin view)
 */
exports.getAll = async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT er.id, er.item_name, er.quantity, er.purpose, er.status, er.requested_at,
              u.full_name as ngo_name
       FROM equipment_requests er
       JOIN users u ON er.ngo_id = u.id
       ORDER BY er.requested_at DESC`
    );

    res.json(requests);
  } catch (err) {
    console.error('Error fetching all equipment requests:', err);
    res.status(500).json({ error: 'Failed to fetch equipment requests', details: err.message });
  }
};
