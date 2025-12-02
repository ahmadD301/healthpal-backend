const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Get JWT secret from environment - MUST be set in production
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be set');
  }
  return secret;
};

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;
    
    // Validation
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['full_name', 'email', 'password', 'role']
      });
    }
    
    // Validate role
    const validRoles = ['patient', 'doctor', 'donor', 'ngo', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid role',
        validRoles 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash, role, phone, verified) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, email, hashedPassword, role, phone || null, false]
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId,
      user: {
        id: result.insertId,
        full_name,
        email,
        role,
        phone,
        verified: false
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Email already registered',
        details: 'Please use a different email or login instead'
      });
    }
    
    console.error('Registration error:', err);
    res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'password']
      });
    }
    
    const [users] = await pool.execute(
      'SELECT id, full_name, email, password_hash, role, phone, verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        verified: user.verified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Refresh token
 * POST /api/auth/refresh
 */
exports.refresh = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, getJwtSecret(), { ignoreExpiration: true });
    
    // Generate new token
    const newToken = jwt.sign(
      { 
        id: decoded.id, 
        email: decoded.email, 
        role: decoded.role 
      },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Token refreshed',
      token: newToken
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token refresh failed' });
  }
};

