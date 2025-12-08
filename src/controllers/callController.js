const pool = require('../config/database');

// ============== VIDEO CALLS ==============

// Start a video call
exports.startVideoCall = async (req, res) => {
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

    // Insert video call record with proper timestamp
    const [result] = await pool.execute(
      `INSERT INTO video_calls (consultation_id, initiator_id, status, started_at) 
       VALUES (?, ?, 'active', NOW())`,
      [consultationId, initiator_id]
    );

    // Update consultation status to in-progress
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['in-progress', consultationId]
    );

    res.status(201).json({
      message: 'Video call started',
      callId: result.insertId,
      consultationId: consultationId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start video call', details: err.message });
  }
};

// End a video call
exports.endVideoCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { duration_seconds } = req.body;

    // Get call record
    const [calls] = await pool.execute(
      'SELECT * FROM video_calls WHERE id = ?',
      [callId]
    );

    if (calls.length === 0) {
      return res.status(404).json({ error: 'Video call not found' });
    }

    // Update call record
    await pool.execute(
      `UPDATE video_calls SET status = ?, ended_at = NOW(), duration_seconds = ? WHERE id = ?`,
      ['completed', duration_seconds || 0, callId]
    );

    // Update consultation status to completed
    const consultationId = calls[0].consultation_id;
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['completed', consultationId]
    );

    res.json({ message: 'Video call ended successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end video call', details: err.message });
  }
};

// Get video calls for a consultation
exports.getVideoCallsForConsultation = async (req, res) => {
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

// ============== AUDIO CALLS ==============

// Start an audio call
exports.startAudioCall = async (req, res) => {
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

    // Insert audio call record with proper timestamp
    const [result] = await pool.execute(
      `INSERT INTO audio_calls (consultation_id, initiator_id, status, started_at) 
       VALUES (?, ?, 'active', NOW())`,
      [consultationId, initiator_id]
    );

    // Update consultation status to in-progress
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['in-progress', consultationId]
    );

    res.status(201).json({
      message: 'Audio call started',
      callId: result.insertId,
      consultationId: consultationId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start audio call', details: err.message });
  }
};

// End an audio call
exports.endAudioCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { duration_seconds } = req.body;

    // Get call record
    const [calls] = await pool.execute(
      'SELECT * FROM audio_calls WHERE id = ?',
      [callId]
    );

    if (calls.length === 0) {
      return res.status(404).json({ error: 'Audio call not found' });
    }

    // Update call record
    await pool.execute(
      `UPDATE audio_calls SET status = ?, ended_at = NOW(), duration_seconds = ? WHERE id = ?`,
      ['completed', duration_seconds || 0, callId]
    );

    // Update consultation status to completed
    const consultationId = calls[0].consultation_id;
    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      ['completed', consultationId]
    );

    res.json({ message: 'Audio call ended successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end audio call', details: err.message });
  }
};

// Get audio calls for a consultation
exports.getAudioCallsForConsultation = async (req, res) => {
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

// Get call statistics
exports.getCallStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [videoStats] = await pool.execute(
      `SELECT COUNT(*) as total_calls, AVG(duration_seconds) as avg_duration, SUM(duration_seconds) as total_duration
       FROM video_calls WHERE initiator_id = ? AND status = 'completed'`,
      [userId]
    );

    const [audioStats] = await pool.execute(
      `SELECT COUNT(*) as total_calls, AVG(duration_seconds) as avg_duration, SUM(duration_seconds) as total_duration
       FROM audio_calls WHERE initiator_id = ? AND status = 'completed'`,
      [userId]
    );

    res.json({
      video_calls: videoStats[0],
      audio_calls: audioStats[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call statistics', details: err.message });
  }
};
