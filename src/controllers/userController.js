const pool = require('../config/database');
const bcrypt = require('bcrypt');

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
    
    // Build update query dynamically based on what's provided
    let updateFields = [];
    let updateValues = [];
    
    if (full_name !== undefined && full_name !== null) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    
    if (phone !== undefined && phone !== null) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(req.user.id);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await pool.execute(query, updateValues);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'currentPassword, newPassword, and confirmPassword are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        error: 'Passwords do not match', 
        details: 'newPassword and confirmPassword must be identical' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password too short', 
        details: 'Password must be at least 6 characters long' 
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        details: 'New password must be different from current password' 
      });
    }

    // Get current user
    const [users] = await pool.execute(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid current password',
        details: 'The current password you entered is incorrect' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed', details: err.message });
  }
};

