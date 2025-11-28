const pool = require('../config/database');

// Book a consultation
exports.book = async (req, res) => {
  try {
    const { doctor_id, consultation_date, mode, notes } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO consultations (patient_id, doctor_id, consultation_date, mode, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, doctor_id, consultation_date, mode, notes]
    );

    res.status(201).json({ 
      message: 'Consultation booked successfully',
      consultationId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Booking failed', details: err.message });
  }
};

// Get consultations
exports.getAll = async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'patient') {
      query = `
        SELECT c.*, d.specialty, u.full_name as doctor_name 
        FROM consultations c 
        JOIN doctor_profiles d ON c.doctor_id = d.user_id 
        JOIN users u ON c.doctor_id = u.id 
        WHERE c.patient_id = ?
      `;
      params = [req.user.id];
    } else if (req.user.role === 'doctor') {
      query = `
        SELECT c.*, u.full_name as patient_name 
        FROM consultations c 
        JOIN users u ON c.patient_id = u.id 
        WHERE c.doctor_id = ?
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [consultations] = await pool.execute(query, params);
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consultations', details: err.message });
  }
};

// Update consultation status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const consultationId = req.params.id;

    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      [status, consultationId]
    );

    res.json({ message: 'Consultation status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};
