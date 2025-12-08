const pool = require('../config/database');

// ==================== MENTAL HEALTH SESSIONS ====================

// Schedule mental health session
exports.schedule = async (req, res) => {
  try {
    const { counselor_id, session_date, mode, notes } = req.body;

    if (!counselor_id || !session_date || !mode) {
      return res.status(400).json({ error: 'Missing required fields: counselor_id, session_date, mode' });
    }

    // Validate mode
    const validModes = ['chat', 'audio', 'video'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be: chat, audio, or video' });
    }

    // Parse and validate date format - accept YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS
    let formattedDate = session_date.trim();
    
    // If only date is provided (YYYY-MM-DD), add default time
    if (formattedDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      formattedDate += ' 10:00:00';
    }
    // If YYYY-MM-DD HH:MM format, add seconds
    else if (formattedDate.match(/^\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}$/)) {
      formattedDate += ':00';
    }
    // Validate full format YYYY-MM-DD HH:MM:SS
    else if (!formattedDate.match(/^\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}$/)) {
      return res.status(400).json({ error: 'Invalid date format. Use: YYYY-MM-DD or YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' });
    }

    // Normalize date parts with leading zeros (e.g., 2025-2-2 -> 2025-02-02)
    const dateMatch = formattedDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      const timepart = dateMatch[4];
      formattedDate = `${year}-${month}-${day}${timepart}`;
    }

    // Validate that the date is a valid date and in the future
    const dateObj = new Date(formattedDate.replace(' ', 'T'));
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date value' });
    }

    // Optional: Check if session is in the future
    if (dateObj < new Date()) {
      return res.status(400).json({ error: 'Session date must be in the future' });
    }

    // Verify counselor exists and is a doctor
    const [counselors] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND role = "doctor"',
      [counselor_id]
    );

    if (counselors.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    const [result] = await pool.execute(
      `INSERT INTO mental_health_sessions (user_id, counselor_id, session_date, mode, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, counselor_id, formattedDate, mode, notes || null]
    );

    res.status(201).json({ 
      message: 'Session scheduled successfully',
      sessionId: result.insertId,
      status: 'scheduled'
    });
  } catch (err) {
    console.error('Mental health session error:', err);
    res.status(500).json({ error: 'Failed to schedule session', details: err.message });
  }
};

// Get user's mental health sessions
exports.getAll = async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      `SELECT mhs.*, u.full_name as counselor_name 
       FROM mental_health_sessions mhs 
       LEFT JOIN users u ON mhs.counselor_id = u.id 
       WHERE mhs.user_id = ? 
       ORDER BY mhs.session_date DESC`,
      [req.user.id]
    );

    // Ensure status has a default value if NULL
    const sessionsWithDefaults = sessions.map(s => ({
      ...s,
      status: s.status || 'scheduled'
    }));

    res.json(sessionsWithDefaults);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
};

// ==================== SUPPORT GROUPS ====================

/**
 * Create a new support group
 */
exports.createSupportGroup = async (req, res) => {
  try {
    const { name, description, category, isAnonymous } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO support_groups (name, description, category, is_anonymous, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, description, category, isAnonymous || false, req.user.id]
    );

    res.status(201).json({
      message: 'Support group created',
      groupId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create support group', details: err.message });
  }
};

/**
 * Get all support groups
 */
exports.getAllGroups = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT sg.*, u.full_name as moderator_name, COUNT(sgm.id) as member_count
      FROM support_groups sg
      JOIN users u ON sg.created_by = u.id
      LEFT JOIN support_group_members sgm ON sg.id = sgm.group_id
    `;

    const params = [];

    if (category) {
      query += ' WHERE sg.category = ?';
      params.push(category);
    }

    query += ' GROUP BY sg.id ORDER BY sg.created_at DESC';

    const [groups] = await pool.execute(query, params);

    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch support groups', details: err.message });
  }
};

/**
 * Get group by ID with members and recent messages
 */
exports.getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;

    const [group] = await pool.execute(
      `SELECT sg.*, u.full_name as moderator_name 
       FROM support_groups sg 
       JOIN users u ON sg.created_by = u.id 
       WHERE sg.id = ?`,
      [groupId]
    );

    if (group.length === 0) {
      return res.status(404).json({ error: 'Support group not found' });
    }

    // Get members
    const [members] = await pool.execute(
      `SELECT u.id, u.full_name, u.email, sgm.joined_at 
       FROM support_group_members sgm 
       JOIN users u ON sgm.user_id = u.id 
       WHERE sgm.group_id = ?
       ORDER BY sgm.joined_at DESC`,
      [groupId]
    );

    // Get recent messages
    const [messages] = await pool.execute(
      `SELECT sgm.id, sgm.message_text, sgm.created_at, sgm.user_id,
              CASE WHEN sg.is_anonymous THEN 'Anonymous' ELSE u.full_name END as sender_name
       FROM support_group_messages sgm
       LEFT JOIN users u ON sgm.user_id = u.id
       LEFT JOIN support_groups sg ON sgm.group_id = sg.id
       WHERE sgm.group_id = ?
       ORDER BY sgm.created_at DESC
       LIMIT 50`,
      [groupId]
    );

    res.json({
      group: group[0],
      members,
      recentMessages: messages.reverse()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group details', details: err.message });
  }
};

/**
 * Join a support group
 */
exports.joinGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // Check if already a member
    const [existing] = await pool.execute(
      'SELECT id FROM support_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add to group
    await pool.execute(
      'INSERT INTO support_group_members (group_id, user_id, joined_at) VALUES (?, ?, NOW())',
      [groupId, userId]
    );

    res.json({ message: 'Successfully joined support group' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group', details: err.message });
  }
};

/**
 * Leave a support group
 */
exports.leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    await pool.execute(
      'DELETE FROM support_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );

    res.json({ message: 'Successfully left support group' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave group', details: err.message });
  }
};

// ==================== GROUP MESSAGING ====================

/**
 * Send message to support group
 */
exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId, messageText } = req.body;

    if (!groupId || !messageText) {
      return res.status(400).json({ error: 'Missing group ID or message' });
    }

    // Check if user is a member
    const [member] = await pool.execute(
      'SELECT id FROM support_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (member.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Save message
    const [result] = await pool.execute(
      `INSERT INTO support_group_messages (group_id, user_id, message_text, created_at) 
       VALUES (?, ?, ?, NOW())`,
      [groupId, req.user.id, messageText]
    );

    res.status(201).json({
      message: 'Message sent',
      messageId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

/**
 * Get group messages with pagination
 */
exports.getGroupMessages = async (req, res) => {
  try {
    const groupId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if user is a member
    const [member] = await pool.execute(
      'SELECT id FROM support_group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.id]
    );

    if (member.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    // Get group info
    const [group] = await pool.execute(
      'SELECT is_anonymous FROM support_groups WHERE id = ?',
      [groupId]
    );

    const [messages] = await pool.execute(
      `SELECT sgm.id, sgm.message_text, sgm.created_at, sgm.user_id,
              CASE WHEN ? THEN 'Anonymous' ELSE u.full_name END as sender_name
       FROM support_group_messages sgm
       LEFT JOIN users u ON sgm.user_id = u.id
       WHERE sgm.group_id = ?
       ORDER BY sgm.created_at DESC
       LIMIT ? OFFSET ?`,
      [group[0].is_anonymous, groupId, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM support_group_messages WHERE group_id = ?',
      [groupId]
    );

    res.json({
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

// ==================== THERAPY RESOURCES ====================

/**
 * Create therapy resource
 */
exports.createTherapyResource = async (req, res) => {
  try {
    const { title, description, type, category, content, isAnonymous } = req.body;

    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO therapy_resources (title, description, type, category, content, is_anonymous, created_by, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [title, description, type, category, content, isAnonymous || false, req.user.id]
    );

    res.status(201).json({
      message: 'Therapy resource created',
      resourceId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create resource', details: err.message });
  }
};

/**
 * Get therapy resources
 */
exports.getTherapyResources = async (req, res) => {
  try {
    const { type, category } = req.query;

    let query = 'SELECT * FROM therapy_resources WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const [resources] = await pool.execute(query, params);

    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources', details: err.message });
  }
};

/**
 * Get resource by ID
 */
exports.getResourceById = async (req, res) => {
  try {
    const resourceId = req.params.id;

    const [resource] = await pool.execute(
      'SELECT * FROM therapy_resources WHERE id = ?',
      [resourceId]
    );

    if (resource.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(resource[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resource', details: err.message });
  }
};

// ==================== ANONYMOUS THERAPY CHAT ====================

/**
 * Start anonymous therapy chat
 */
exports.startAnonymousChat = async (req, res) => {
  try {
    const { counselorId, concern } = req.body;

    if (!counselorId) {
      return res.status(400).json({ error: 'Counselor ID required' });
    }

    // Create anonymous session
    const [result] = await pool.execute(
      `INSERT INTO anonymous_therapy_chats (user_id, counselor_id, concern, status, created_at) 
       VALUES (?, ?, ?, 'active', NOW())`,
      [req.user.id, counselorId, concern || null]
    );

    res.status(201).json({
      message: 'Anonymous chat session started',
      chatId: result.insertId,
      status: 'active'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start chat', details: err.message });
  }
};

/**
 * Send message in anonymous therapy chat
 */
exports.sendAnonymousChatMessage = async (req, res) => {
  try {
    const { chatId, messageText, isFromCounselor } = req.body;

    if (!chatId || !messageText) {
      return res.status(400).json({ error: 'Missing chat ID or message' });
    }

    // Verify authorization
    const [chat] = await pool.execute(
      'SELECT * FROM anonymous_therapy_chats WHERE id = ? AND (user_id = ? OR counselor_id = ?)',
      [chatId, req.user.id, req.user.id]
    );

    if (chat.length === 0) {
      return res.status(403).json({ error: 'Unauthorized access to chat' });
    }

    // Save message
    const [result] = await pool.execute(
      `INSERT INTO anonymous_therapy_messages (chat_id, sender_id, message_text, created_at) 
       VALUES (?, ?, ?, NOW())`,
      [chatId, req.user.id, messageText]
    );

    res.status(201).json({
      message: 'Message sent',
      messageId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

/**
 * Get anonymous chat messages
 */
exports.getAnonymousChatMessages = async (req, res) => {
  try {
    const chatId = req.params.id;

    // Verify authorization
    const [chat] = await pool.execute(
      'SELECT * FROM anonymous_therapy_chats WHERE id = ? AND (user_id = ? OR counselor_id = ?)',
      [chatId, req.user.id, req.user.id]
    );

    if (chat.length === 0) {
      return res.status(403).json({ error: 'Unauthorized access to chat' });
    }

    // Get messages
    const [messages] = await pool.execute(
      `SELECT atm.*, 'You' as sender_name 
       FROM anonymous_therapy_messages atm 
       WHERE atm.chat_id = ? 
       ORDER BY atm.created_at ASC`,
      [chatId]
    );

    res.json({
      chat: chat[0],
      messages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

/**
 * End anonymous chat
 */
exports.endAnonymousChat = async (req, res) => {
  try {
    const chatId = req.params.id;

    // Verify authorization
    const [chat] = await pool.execute(
      'SELECT * FROM anonymous_therapy_chats WHERE id = ? AND (user_id = ? OR counselor_id = ?)',
      [chatId, req.user.id, req.user.id]
    );

    if (chat.length === 0) {
      return res.status(403).json({ error: 'Unauthorized access to chat' });
    }

    // Update status
    await pool.execute(
      'UPDATE anonymous_therapy_chats SET status = ?, ended_at = NOW() WHERE id = ?',
      ['ended', chatId]
    );

    res.json({ message: 'Chat session ended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end chat', details: err.message });
  }
};
