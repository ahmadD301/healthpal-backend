const pool = require('../config/database');

// Get patient profile
exports.getProfile = async (req, res) => {
  try {
    const [profiles] = await pool.execute(
      `SELECT p.*, u.full_name, u.email, u.phone 
       FROM patient_profiles p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ?`,
      [req.params.id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    res.json(profiles[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
};

// Create or update patient profile
exports.saveProfile = async (req, res) => {
  try {
    const { age, gender, blood_type, medical_history, location } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM patient_profiles WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE patient_profiles 
         SET age = ?, gender = ?, blood_type = ?, medical_history = ?, location = ? 
         WHERE user_id = ?`,
        [age, gender, blood_type, medical_history, location, req.user.id]
      );
      res.json({ message: 'Profile updated successfully' });
    } else {
      await pool.execute(
        `INSERT INTO patient_profiles (user_id, age, gender, blood_type, medical_history, location) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, age, gender, blood_type, medical_history, location]
      );
      res.status(201).json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
};
