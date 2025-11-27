const pool = require('../config/database');

// Create sponsorship campaign
exports.create = async (req, res) => {
  try {
    const { treatment_type, goal_amount, description } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO sponsorships (patient_id, treatment_type, goal_amount, description) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, treatment_type, goal_amount, description]
    );

    res.status(201).json({ 
      message: 'Sponsorship campaign created',
      sponsorshipId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
};

// Get all open sponsorships
exports.getAll = async (req, res) => {
  try {
    const [sponsorships] = await pool.execute(
      `SELECT s.*, u.full_name as patient_name, p.age, p.location 
       FROM sponsorships s 
       JOIN users u ON s.patient_id = u.id 
       LEFT JOIN patient_profiles p ON s.patient_id = p.user_id 
       WHERE s.status = 'open'`
    );

    res.json(sponsorships);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsorships', details: err.message });
  }
};

// Donate to sponsorship
exports.donate = async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const sponsorshipId = req.params.id;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        `INSERT INTO transactions (sponsorship_id, donor_id, amount, payment_method) 
         VALUES (?, ?, ?, ?)`,
        [sponsorshipId, req.user.id, amount, payment_method]
      );

      await connection.execute(
        `UPDATE sponsorships 
         SET donated_amount = donated_amount + ?, 
             status = CASE WHEN donated_amount + ? >= goal_amount THEN 'funded' ELSE status END 
         WHERE id = ?`,
        [amount, amount, sponsorshipId]
      );

      await connection.commit();
      res.json({ message: 'Donation successful' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Donation failed', details: err.message });
  }
};
