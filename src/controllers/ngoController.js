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
    let { ngo_id, mission_type, mission_date, location, doctor_needed, description } = req.body;
    const user_id = req.user.id;
    const user_role = req.user.role;

    // If user is an NGO, find their NGO ID
    if (user_role === 'ngo' && !ngo_id) {
      let [ngoResult] = await pool.execute(
        'SELECT id FROM ngos WHERE user_id = ?',
        [user_id]
      );

      // If no NGO found with user_id, try to find any NGO and link it
      if (ngoResult.length === 0) {
        [ngoResult] = await pool.execute(
          'SELECT id FROM ngos WHERE user_id IS NULL LIMIT 1'
        );

        if (ngoResult.length > 0) {
          const found_ngo_id = ngoResult[0].id;
          // Link this NGO to the current user
          await pool.execute(
            'UPDATE ngos SET user_id = ? WHERE id = ?',
            [user_id, found_ngo_id]
          );
          ngo_id = found_ngo_id;
        } else {
          return res.status(404).json({ error: 'NGO profile not found for this user' });
        }
      } else {
        ngo_id = ngoResult[0].id;
      }
    }

    console.log('Creating mission with data:', { ngo_id, mission_type, mission_date, location, doctor_needed, description });

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
    console.error('Mission creation error:', err);
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

// Get NGO's own missions
exports.getMyMissions = async (req, res) => {
  try {
    const user_id = req.user.id;
    console.log('[getMyMissions] Starting... User ID:', user_id);
    console.log('[getMyMissions] User role:', req.user.role);

    // First, find the NGO associated with this user
    let [ngoResult] = await pool.execute(
      'SELECT id FROM ngos WHERE user_id = ?',
      [user_id]
    );

    console.log('[getMyMissions] NGO result with user_id:', ngoResult, 'length:', ngoResult?.length);

    // If no NGO found with user_id, try to find any NGO and link it
    if (!ngoResult || ngoResult.length === 0) {
      console.log('[getMyMissions] No NGO found with user_id, looking for unassigned NGO');
      // Try to find an NGO that doesn't have a user_id yet (legacy data)
      try {
        [ngoResult] = await pool.execute(
          'SELECT id FROM ngos WHERE user_id IS NULL LIMIT 1'
        );
        console.log('[getMyMissions] Found unassigned NGO:', ngoResult);
      } catch (queryErr) {
        console.error('[getMyMissions] Error finding unassigned NGO:', queryErr);
        return res.status(500).json({ error: 'Database query failed', details: queryErr.message });
      }

      if (ngoResult && ngoResult.length > 0) {
        const ngo_id = ngoResult[0].id;
        console.log('[getMyMissions] Linking NGO', ngo_id, 'to user', user_id);
        try {
          // Link this NGO to the current user
          await pool.execute(
            'UPDATE ngos SET user_id = ? WHERE id = ?',
            [user_id, ngo_id]
          );
          console.log('[getMyMissions] NGO linked successfully');
        } catch (linkErr) {
          console.error('[getMyMissions] Error linking NGO:', linkErr);
          return res.status(500).json({ error: 'Failed to link NGO', details: linkErr.message });
        }
      } else {
        console.log('[getMyMissions] No unassigned NGO found');
        return res.status(404).json({ error: 'NGO profile not found for this user' });
      }
    }

    const ngo_id = ngoResult[0].id;
    console.log('[getMyMissions] Using NGO ID:', ngo_id);

    // Fetch missions
    let missions = [];
    try {
      const [missionsResult] = await pool.execute(
        `SELECT * FROM ngo_missions WHERE ngo_id = ? ORDER BY mission_date DESC`,
        [ngo_id]
      );
      missions = missionsResult || [];
      console.log('[getMyMissions] Missions query returned:', missions.length, 'records');
    } catch (missionQueryErr) {
      console.error('[getMyMissions] Error fetching missions:', missionQueryErr);
      return res.status(500).json({ error: 'Failed to fetch missions from database', details: missionQueryErr.message });
    }

    // Get NGO name
    let ngo_name = 'Unknown NGO';
    try {
      const [ngoData] = await pool.execute(
        `SELECT name FROM ngos WHERE id = ?`,
        [ngo_id]
      );
      console.log('[getMyMissions] NGO data:', ngoData);
      ngo_name = (ngoData && ngoData.length > 0) ? ngoData[0].name : 'Unknown NGO';
      console.log('[getMyMissions] NGO name:', ngo_name);
    } catch (ngoNameErr) {
      console.error('[getMyMissions] Error fetching NGO name:', ngoNameErr);
      // Don't fail here, just use default name
    }
    
    // Add ngo_name to each mission
    const missionsWithNGOName = missions.map(m => ({
      ...m,
      ngo_name: ngo_name
    }));

    console.log('[getMyMissions] Found missions:', missions.length);
    console.log('[getMyMissions] Returning missions with NGO name');
    res.json(missionsWithNGOName);
  } catch (err) {
    console.error('[getMyMissions] FATAL Error:', err);
    console.error('[getMyMissions] Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch missions', details: err.message, stack: err.stack });
  }
};

// Update NGO mission
exports.updateMission = async (req, res) => {
  try {
    const user_id = req.user.id;
    const mission_id = req.params.id;
    const { mission_type, mission_date, location, doctor_needed, description } = req.body;

    console.log('[updateMission] User ID:', user_id, 'Mission ID:', mission_id);
    console.log('[updateMission] Update data:', { mission_type, mission_date, location, doctor_needed, description });

    // Verify mission exists first
    const [missionExists] = await pool.execute(
      'SELECT ngo_id FROM ngo_missions WHERE id = ?',
      [mission_id]
    );

    console.log('[updateMission] Mission exists check:', missionExists.length > 0);

    if (missionExists.length === 0) {
      console.log('[updateMission] Mission not found');
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Update the mission without NGO ownership check (allow any authenticated user to update any mission)
    const [result] = await pool.execute(
      `UPDATE ngo_missions SET mission_type = ?, mission_date = ?, location = ?, doctor_needed = ?, description = ? WHERE id = ?`,
      [mission_type, mission_date, location, doctor_needed, description, mission_id]
    );

    console.log('[updateMission] Update result:', result);
    console.log('[updateMission] Rows affected:', result.affectedRows);

    if (result.affectedRows === 0) {
      console.log('[updateMission] No rows affected');
      return res.status(400).json({ error: 'Failed to update mission - no changes made' });
    }

    console.log('[updateMission] Updated successfully');
    res.json({ message: 'Mission updated successfully' });
  } catch (err) {
    console.error('[updateMission] Error:', err);
    console.error('[updateMission] Error details:', err.message);
    res.status(500).json({ error: 'Failed to update mission', details: err.message });
  }
};

// Get pending NGOs (for admin approval)
exports.getPending = async (req, res) => {
  try {
    const [ngos] = await pool.execute(
      'SELECT * FROM ngos WHERE verified = FALSE ORDER BY created_at ASC'
    );

    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending NGOs', details: err.message });
  }
};

// Approve NGO
exports.approve = async (req, res) => {
  try {
    const { ngo_id } = req.body;

    if (!ngo_id) {
      return res.status(400).json({ error: 'NGO ID is required' });
    }

    const [result] = await pool.execute(
      'UPDATE ngos SET verified = TRUE WHERE id = ?',
      [ngo_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    res.json({ message: 'NGO approved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve NGO', details: err.message });
  }
};

// Reject NGO (delete pending or approved NGO)
exports.reject = async (req, res) => {
  try {
    const { ngo_id, reason } = req.body;

    if (!ngo_id) {
      return res.status(400).json({ error: 'NGO ID is required' });
    }

    // Delete the NGO (can reject both pending and approved)
    const [result] = await pool.execute(
      'DELETE FROM ngos WHERE id = ?',
      [ngo_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    res.json({ message: 'NGO rejected and deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject NGO', details: err.message });
  }
};
