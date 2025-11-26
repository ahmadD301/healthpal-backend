const pool = require('../config/database');

// Get current user
exports.getMe = async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role, phone, verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    
    await pool.execute(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [full_name, phone, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};
