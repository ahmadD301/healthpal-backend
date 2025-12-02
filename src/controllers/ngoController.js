const pool = require('../config/database');

// Register NGO
exports.register = async (req, res) => {
  try {
    const { name, contact_info } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO ngos (name, contact_info) VALUES (?, ?)',
      [name, contact_info]
    );

    res.status(201).json({ 
      message: 'NGO registered',
      ngoId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register NGO', details: err.message });
  }
};

// Get all verified NGOs
exports.getAll = async (req, res) => {
  try {
    const [ngos] = await pool.execute(
      'SELECT * FROM ngos ORDER BY created_at DESC'
    );

    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs', details: err.message });
  }
};

// Create NGO mission
exports.createMission = async (req, res) => {
  try {
    const { ngo_id, mission_type, mission_date, location, doctor_needed, description } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO ngo_missions (ngo_id, mission_type, mission_date, location, doctor_needed, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ngo_id, mission_type, mission_date, location, doctor_needed, description]
    );

    res.status(201).json({ 
      message: 'Mission created',
      missionId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create mission', details: err.message });
  }
};

// Get all NGO missions
exports.getMissions = async (req, res) => {
  try {
    const [missions] = await pool.execute(
      `SELECT nm.*, n.name as ngo_name 
       FROM ngo_missions nm 
       JOIN ngos n ON nm.ngo_id = n.id 
       ORDER BY nm.mission_date DESC`
    );

    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch missions', details: err.message });
  }
};
