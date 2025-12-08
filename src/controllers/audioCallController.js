const pool = require('../config/database');

// Start an audio call
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

    // Verify it's an audio consultation
    if (consultations[0].mode !== 'audio') {
      return res.status(400).json({ error: 'This consultation is not an audio consultation' });
    }

    // Insert audio call record
    const [result] = await pool.execute(
      `INSERT INTO audio_calls (consultation_id, initiator_id, status, started_at) 
       VALUES (?, ?, 'active', NOW())`,
      [consultationId, initiator_id]
    );

    // Don't change consultation status - keep it as 'accepted' during active call
    // It will be marked as 'completed' only when the call ends

    res.status(201).json({
      message: 'Audio call started',
      callId: result.insertId,
      consultationId: consultationId
    });
  } catch (err) {
    console.error('Error starting audio call:', err);
    res.status(500).json({ error: 'Failed to start audio call', details: err.message });
  }
};

// Get all audio calls for a consultation
exports.getAllCalls = async (req, res) => {
  try {
    const consultationId = req.params.id;

    const [calls] = await pool.execute(
      `SELECT a.*, u.full_name as initiator_name 
       FROM audio_calls a 
       JOIN users u ON a.initiator_id = u.id 
       WHERE a.consultation_id = ? 
       ORDER BY a.started_at DESC`,
      [consultationId]
    );

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audio calls', details: err.message });
  }
};

// End an audio call
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
      `UPDATE audio_calls SET status = ?, ended_at = NOW(), duration_seconds = ? WHERE id = ?`,
      ['completed', duration_seconds || 0, callId]
    );

    // Update consultation status to completed
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['completed', consultationId]
    );

    res.json({ message: 'Audio call ended successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end audio call', details: err.message });
  }
};
