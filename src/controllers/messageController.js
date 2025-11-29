const pool = require('../config/database');

// Send a message
exports.send = async (req, res) => {
  try {
    const { message_text } = req.body;
    const consultationId = req.params.id;

    const [result] = await pool.execute(
      'INSERT INTO messages (consultation_id, sender_id, message_text) VALUES (?, ?, ?)',
      [consultationId, req.user.id, message_text]
    );

    res.status(201).json({ 
      message: 'Message sent',
      messageId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

// Get messages for a consultation
exports.getAll = async (req, res) => {
  try {
    const consultationId = req.params.id;

    const [messages] = await pool.execute(
      `SELECT m.*, u.full_name as sender_name 
       FROM messages m 
       JOIN users u ON m.sender_id = u.id 
       WHERE m.consultation_id = ? 
       ORDER BY m.sent_at ASC`,
      [consultationId]
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};
