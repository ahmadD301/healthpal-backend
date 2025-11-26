const pool = require('../config/database');

const logRequest = async (req, res, next) => {
  if (req.user) {
    try {
      await pool.execute(
        'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
        [req.user.id, `${req.method} ${req.path}`, req.ip]
      );
    } catch (err) {
      console.error('Logging error:', err);
    }
  }
  next();
};

module.exports = logRequest;
