const pool = require('../config/database');

// Start a video call
exports.startCall = async (req, res) => {
  try {
    const consultationId = req.params.id;
    const initiator_id = req.user.id;

    // Verify consultation exists and belongs to user
    const [consultations] = await pool.execute(
      'SELECT * FROM consultations WHERE id = ? AND (patient_id = ? OR doctor_id = ?)',
      [consultationId, initiator_id, initiator_id]
    );

    if (consultations.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Verify it's a video consultation
    if (consultations[0].mode !== 'video') {
      return res.status(400).json({ error: 'This consultation is not a video consultation' });
    }

    // Insert video call record
    const [result] = await pool.execute(
      `INSERT INTO video_calls (consultation_id, initiator_id, status, started_at) 
       VALUES (?, ?, 'active', NOW())`,
      [consultationId, initiator_id]
    );

    // Don't change consultation status - keep it as 'accepted' during active call
    // It will be marked as 'completed' only when the call ends

    res.status(201).json({
      message: 'Video call started',
      callId: result.insertId,
      consultationId: consultationId
    });
  } catch (err) {
    console.error('Error starting video call:', err);
    res.status(500).json({ error: 'Failed to start video call', details: err.message });
  }
};

// Get all video calls for a consultation
exports.getAllCalls = async (req, res) => {
  try {
    const consultationId = req.params.id;

    const [calls] = await pool.execute(
      `SELECT v.*, u.full_name as initiator_name 
       FROM video_calls v 
       JOIN users u ON v.initiator_id = u.id 
       WHERE v.consultation_id = ? 
       ORDER BY v.started_at DESC`,
      [consultationId]
    );

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch video calls', details: err.message });
  }
};

// End a video call
exports.endCall = async (req, res) => {
  try {
    const { callId, duration_seconds } = req.body;
    const consultationId = req.params.id;

    // Verify consultation exists
    const [consultations] = await pool.execute(
      'SELECT id FROM consultations WHERE id = ?',
      [consultationId]
    );

    if (consultations.length === 0) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    // Update call record
    await pool.execute(
      `UPDATE video_calls SET status = ?, ended_at = NOW(), duration_seconds = ? WHERE id = ?`,
      ['completed', duration_seconds || 0, callId]
    );

    // Update consultation status to completed
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['completed', consultationId]
    );

    res.json({ message: 'Video call ended successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end video call', details: err.message });
  }
};
