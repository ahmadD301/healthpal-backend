const pool = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const { specialty } = req.query;
    
    let query = `
      SELECT d.*, u.full_name, u.email, u.phone 
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
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors', details: err.message });
  }
};

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
