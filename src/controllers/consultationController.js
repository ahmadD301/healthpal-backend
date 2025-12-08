const pool = require('../config/database');

// Book a consultation
exports.book = async (req, res) => {
  try {
    const { doctor_id, consultation_date, mode, notes } = req.body;

    // Log for debugging
    console.log('Booking consultation:', {
      patient_id: req.user.id,
      doctor_id,
      consultation_date,
      mode,
      notes
    });

    // Validate required fields
    if (!doctor_id || !consultation_date || !mode) {
      return res.status(400).json({ 
        error: 'Booking failed', 
        details: 'Missing required fields: doctor_id, consultation_date, mode' 
      });
    }

    // Validate consultation mode
    const validModes = ['chat', 'audio', 'video'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ 
        error: 'Booking failed', 
        details: `Invalid mode. Must be: ${validModes.join(', ')}` 
      });
    }

    // Check if doctor exists
    const [doctors] = await pool.execute(
      'SELECT id FROM doctor_profiles WHERE user_id = ?',
      [doctor_id]
    );

    if (doctors.length === 0) {
      return res.status(400).json({ 
        error: 'Booking failed', 
        details: `Doctor with ID ${doctor_id} does not exist` 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO consultations (patient_id, doctor_id, consultation_date, mode, notes, status) 
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, doctor_id, consultation_date, mode, notes || '']
    );

    res.status(201).json({ 
      message: 'Consultation booked successfully',
      consultationId: result.insertId 
    });
  } catch (err) {
    console.error('Booking error:', err);
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
        ORDER BY c.consultation_date DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'doctor') {
      query = `
        SELECT c.*, u.full_name as patient_name 
        FROM consultations c 
        JOIN users u ON c.patient_id = u.id 
        WHERE c.doctor_id = ?
        ORDER BY c.consultation_date DESC
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [consultations] = await pool.execute(query, params);
    
    // Ensure status is always set (default to 'pending' if NULL)
    const formattedConsultations = consultations.map(c => ({
      ...c,
      status: c.status || 'pending'
    }));
    
    res.json(formattedConsultations);
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
