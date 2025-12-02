const pool = require('../config/database');

// Get all doctors
exports.getAll = async (req, res) => {
  try {
    const { specialty } = req.query;
    
    let query = `
      SELECT d.id, d.user_id, d.specialty, d.license_no, d.experience_years, d.consultation_fee, d.available, u.full_name, u.email, u.phone 
      FROM doctor_profiles d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.available = TRUE
    `;
    const params = [];

    if (specialty) {
      query += ' AND d.specialty = ?';
      params.push(specialty);
    }

    const [doctors] = await pool.execute(query, params);
    
    // Map the data so that 'id' refers to user_id for API consistency
    const mappedDoctors = doctors.map(doc => ({
      ...doc,
      id: doc.user_id  // Override id to be the user_id for booking purposes
    }));
    
    res.json(mappedDoctors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors', details: err.message });
  }
};

// Create or update doctor profile
exports.saveProfile = async (req, res) => {
  try {
    const { specialty, license_no, experience_years, consultation_fee } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM doctor_profiles WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE doctor_profiles 
         SET specialty = ?, license_no = ?, experience_years = ?, consultation_fee = ? 
         WHERE user_id = ?`,
        [specialty, license_no, experience_years, consultation_fee, req.user.id]
      );
      res.json({ message: 'Profile updated successfully' });
    } else {
      await pool.execute(
        `INSERT INTO doctor_profiles (user_id, specialty, license_no, experience_years, consultation_fee) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, specialty, license_no, experience_years, consultation_fee]
      );
      res.status(201).json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
};
