const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Store active connections: { consultationId: { patientSocketId, doctorSocketId } }
const activeConnections = {};

// Store user socket mappings: { userId: socketId }
const userSockets = {};

/**
 * Initialize Socket.io with authentication
 */
const initializeSocket = (io) => {
  // Middleware: Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication failed: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid token'));
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.userId} connected with socket ${socket.id}`);
    userSockets[socket.userId] = socket.id;

    // ==================== CONSULTATION MESSAGING ====================

    /**
     * Join consultation room
     * Event: join-consultation
     * Data: { consultationId }
     */
    socket.on('join-consultation', async (data) => {
      const { consultationId } = data;

      try {
        // Verify user is part of this consultation
        const [consultation] = await pool.execute(
          'SELECT * FROM consultations WHERE id = ?',
          [consultationId]
        );

        if (consultation.length === 0) {
          return socket.emit('error', { message: 'Consultation not found' });
        }

        const consultation_data = consultation[0];

        // Check authorization
        if (
          consultation_data.patient_id !== socket.userId &&
          consultation_data.doctor_id !== socket.userId
        ) {
          return socket.emit('error', { message: 'Unauthorized access to consultation' });
        }

        // Join the room
        socket.join(`consultation-${consultationId}`);

        // Store connection
        if (!activeConnections[consultationId]) {
          activeConnections[consultationId] = {};
        }

        if (socket.userRole === 'patient') {
          activeConnections[consultationId].patientSocketId = socket.id;
        } else if (socket.userRole === 'doctor') {
          activeConnections[consultationId].doctorSocketId = socket.id;
        }

        console.log(`👤 User ${socket.userId} joined consultation ${consultationId}`);

        // Notify the other party
        socket
          .to(`consultation-${consultationId}`)
          .emit('user-joined', {
            userId: socket.userId,
            role: socket.userRole,
            message: `${socket.userRole} joined the consultation`
          });

        socket.emit('join-success', {
          consultationId,
          message: 'Successfully joined consultation'
        });
      } catch (err) {
        console.error('Error joining consultation:', err);
        socket.emit('error', { message: 'Failed to join consultation' });
      }
    });

    /**
     * Send message in consultation
     * Event: send-message
     * Data: { consultationId, messageText }
     */
    socket.on('send-message', async (data) => {
      const { consultationId, messageText } = data;

      if (!consultationId || !messageText) {
        return socket.emit('error', { message: 'Missing consultation ID or message' });
      }

      try {
        // Save message to database
        const [result] = await pool.execute(
          'INSERT INTO messages (consultation_id, sender_id, message_text, sent_at) VALUES (?, ?, ?, NOW())',
          [consultationId, socket.userId, messageText]
        );

        const messageId = result.insertId;

        // Get sender info
        const [users] = await pool.execute(
          'SELECT id, full_name, email FROM users WHERE id = ?',
          [socket.userId]
        );

        const sender = users[0];

        // Broadcast message to all clients in the room
        io.to(`consultation-${consultationId}`).emit('new-message', {
          messageId,
          consultationId,
          senderId: socket.userId,
          senderName: sender.full_name,
          senderRole: socket.userRole,
          messageText,
          timestamp: new Date()
        });

        console.log(`💬 Message ${messageId} sent in consultation ${consultationId}`);
      } catch (err) {
        console.error('Error saving message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * Mark message as read
     * Event: message-read
     * Data: { messageId }
     */
    socket.on('message-read', async (data) => {
      const { messageId } = data;

      try {
        await pool.execute(
          'UPDATE messages SET is_read = 1 WHERE id = ?',
          [messageId]
        );

        io.emit('message-read-status', {
          messageId,
          readBy: socket.userId,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('Error marking message as read:', err);
      }
    });

    // ==================== TYPING INDICATOR ====================

    /**
     * User typing indicator
     * Event: typing
     * Data: { consultationId }
     */
    socket.on('typing', (data) => {
      const { consultationId } = data;

      socket.to(`consultation-${consultationId}`).emit('user-typing', {
        userId: socket.userId,
        userRole: socket.userRole
      });
    });

    /**
     * Stop typing
     * Event: stop-typing
     * Data: { consultationId }
     */
    socket.on('stop-typing', (data) => {
      const { consultationId } = data;

      socket.to(`consultation-${consultationId}`).emit('user-stop-typing', {
        userId: socket.userId
      });
    });

    // ==================== CALL SIGNALING (Future Video Integration) ====================

    /**
     * Initiate call
     * Event: initiate-call
     * Data: { consultationId, callType: 'audio' | 'video' }
     */
    socket.on('initiate-call', (data) => {
      const { consultationId, callType } = data;

      socket.to(`consultation-${consultationId}`).emit('incoming-call', {
        from: socket.userId,
        fromRole: socket.userRole,
        callType,
        timestamp: new Date()
      });
    });

    /**
     * Accept call
     * Event: accept-call
     * Data: { consultationId }
     */
    socket.on('accept-call', (data) => {
      const { consultationId } = data;

      socket.to(`consultation-${consultationId}`).emit('call-accepted', {
        acceptedBy: socket.userId,
        timestamp: new Date()
      });
    });

    /**
     * Reject call
     * Event: reject-call
     * Data: { consultationId }
     */
    socket.on('reject-call', (data) => {
      const { consultationId } = data;

      socket.to(`consultation-${consultationId}`).emit('call-rejected', {
        rejectedBy: socket.userId,
        timestamp: new Date()
      });
    });

    /**
     * End call
     * Event: end-call
     * Data: { consultationId }
     */
    socket.on('end-call', (data) => {
      const { consultationId } = data;

      socket.to(`consultation-${consultationId}`).emit('call-ended', {
        endedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // ==================== DISCONNECTION ====================

    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.userId} disconnected`);

      // Clean up user socket mapping
      delete userSockets[socket.userId];

      // Clean up active connections
      for (const consultationId in activeConnections) {
        const conn = activeConnections[consultationId];
        if (conn.patientSocketId === socket.id || conn.doctorSocketId === socket.id) {
          io.to(`consultation-${consultationId}`).emit('user-left', {
            userId: socket.userId,
            userRole: socket.userRole,
            message: `${socket.userRole} left the consultation`
          });

          // Remove empty connection
          if (conn.patientSocketId === socket.id) {
            delete conn.patientSocketId;
          }
          if (conn.doctorSocketId === socket.id) {
            delete conn.doctorSocketId;
          }

          if (!conn.patientSocketId && !conn.doctorSocketId) {
            delete activeConnections[consultationId];
          }
        }
      }
    });

    // ==================== ERROR HANDLING ====================

    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${socket.userId}:`, error);
    });
  });
};

/**
 * Emit notification to a specific user
 */
const notifyUser = (io, userId, eventName, data) => {
  const socketId = userSockets[userId];
  if (socketId) {
    io.to(socketId).emit(eventName, data);
  }
};

/**
 * Emit notification to all users in a consultation
 */
const notifyConsultation = (io, consultationId, eventName, data) => {
  io.to(`consultation-${consultationId}`).emit(eventName, data);
};

/**
 * Get active connections info
 */
const getActiveConnections = () => {
  return activeConnections;
};

module.exports = {
  initializeSocket,
  notifyUser,
  notifyConsultation,
  getActiveConnections,
  userSockets
};
