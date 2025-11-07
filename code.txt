const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 1. MIDDLEWARE (Must come FIRST) ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'healthpal',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== 2. HELPER FUNCTIONS ====================

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Logging middleware
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

app.use(logRequest);

// ==================== 3. EXTERNAL API INTEGRATION ====================
// This is a simplified version that doesn't require separate file

const axios = require('axios');

const externalApis = {
  // Get disease outbreak data (COVID-19)
  getDiseaseOutbreaks: async (country = 'palestine') => {
    try {
      const response = await axios.get(
        `https://disease.sh/v3/covid-19/countries/${country}`,
        { timeout: 5000 }
      );
      
      return {
        country: response.data.country,
        cases: response.data.cases,
        todayCases: response.data.todayCases,
        deaths: response.data.deaths,
        recovered: response.data.recovered,
        active: response.data.active,
        critical: response.data.critical,
        casesPerMillion: response.data.casesPerOneMillion,
        updated: new Date(response.data.updated)
      };
    } catch (error) {
      console.error('Disease API Error:', error.message);
      return null;
    }
  },

  // Get medicine information from OpenFDA
  getMedicineInfo: async (medicineName) => {
    try {
      const response = await axios.get(
        `https://api.fda.gov/drug/label.json`,
        {
          params: {
            search: `openfda.brand_name:"${medicineName}"`,
            limit: 1
          },
          timeout: 5000
        }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        const drug = response.data.results[0];
        return {
          brandName: drug.openfda?.brand_name?.[0],
          genericName: drug.openfda?.generic_name?.[0],
          manufacturer: drug.openfda?.manufacturer_name?.[0],
          warnings: drug.warnings?.[0],
          indications: drug.indications_and_usage?.[0],
          dosage: drug.dosage_and_administration?.[0]
        };
      }
      
      return null;
    } catch (error) {
      console.error('Drug Database API Error:', error.message);
      return null;
    }
  },

  // Get WHO health data
  getWHOHealthData: async (indicator = 'WHOSIS_000001') => {
    try {
      const response = await axios.get(
        `https://ghoapi.azureedge.net/api/${indicator}`,
        { timeout: 10000 }
      );
      
      return response.data.value;
    } catch (error) {
      console.error('WHO API Error:', error.message);
      return null;
    }
  }
};

// ==================== 4. ROUTES (Order matters here!) ====================

// 4A. PUBLIC ROUTES (No authentication needed)

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to HealthPal API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      doctors: '/api/doctors/*',
      consultations: '/api/consultations/*',
      external: '/api/external/*'
    }
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date() });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { full_name, email, password, role, phone } = req.body;
    
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, hashedPassword, role, phone]
    );

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: result.insertId 
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// ==================== 4B. EXTERNAL API ROUTES (PUBLIC - No auth for some) ====================

// Disease Outbreaks (Public)
app.get('/api/external/disease-outbreaks', async (req, res) => {
  try {
    const data = await externalApis.getDiseaseOutbreaks('palestine');
    if (!data) {
      return res.status(503).json({ error: 'Disease data service unavailable' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch disease data', details: err.message });
  }
});

// Medicine Information (Requires authentication)
app.get('/api/external/medicine-info/:name', authenticate, async (req, res) => {
  try {
    const medicineInfo = await externalApis.getMedicineInfo(req.params.name);
    if (!medicineInfo) {
      return res.status(404).json({ error: 'Medicine not found in database' });
    }
    res.json(medicineInfo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicine info', details: err.message });
  }
});

// WHO Health Data (Requires authentication)
app.get('/api/external/who-health-data', authenticate, async (req, res) => {
  try {
    const { indicator = 'WHOSIS_000001' } = req.query;
    const data = await externalApis.getWHOHealthData(indicator);
    if (!data) {
      return res.status(503).json({ error: 'WHO data unavailable' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch WHO data', details: err.message });
  }
});

// ==================== 4C. PROTECTED ROUTES (All require authentication) ====================

// USER ROUTES
app.get('/api/users/me', authenticate, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, full_name, email, role, phone, verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user', details: err.message });
  }
});

app.put('/api/users/me', authenticate, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    
    await pool.execute(
      'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
      [full_name, phone, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// PATIENT ROUTES
app.get('/api/patients/:id', authenticate, async (req, res) => {
  try {
    const [profiles] = await pool.execute(
      `SELECT p.*, u.full_name, u.email, u.phone 
       FROM patient_profiles p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ?`,
      [req.params.id]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    res.json(profiles[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

app.post('/api/patients/profile', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { age, gender, blood_type, medical_history, location } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM patient_profiles WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE patient_profiles 
         SET age = ?, gender = ?, blood_type = ?, medical_history = ?, location = ? 
         WHERE user_id = ?`,
        [age, gender, blood_type, medical_history, location, req.user.id]
      );
      res.json({ message: 'Profile updated successfully' });
    } else {
      await pool.execute(
        `INSERT INTO patient_profiles (user_id, age, gender, blood_type, medical_history, location) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, age, gender, blood_type, medical_history, location]
      );
      res.status(201).json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
});

// DOCTOR ROUTES
app.get('/api/doctors', authenticate, async (req, res) => {
  try {
    const { specialty } = req.query;
    
    let query = `
      SELECT d.*, u.full_name, u.email, u.phone 
      FROM doctor_profiles d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.available = TRUE
    `;
    const params = [];

    if (specialty) {
      query += ' AND d.specialty = ?';
      params.push(specialty);
    }

    const [doctors] = await pool.execute(query, params);
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors', details: err.message });
  }
});

app.post('/api/doctors/profile', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const { specialty, license_no, experience_years, consultation_fee } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM doctor_profiles WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE doctor_profiles 
         SET specialty = ?, license_no = ?, experience_years = ?, consultation_fee = ? 
         WHERE user_id = ?`,
        [specialty, license_no, experience_years, consultation_fee, req.user.id]
      );
      res.json({ message: 'Profile updated successfully' });
    } else {
      await pool.execute(
        `INSERT INTO doctor_profiles (user_id, specialty, license_no, experience_years, consultation_fee) 
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, specialty, license_no, experience_years, consultation_fee]
      );
      res.status(201).json({ message: 'Profile created successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
});

// CONSULTATION ROUTES
app.post('/api/consultations', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { doctor_id, consultation_date, mode, notes } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO consultations (patient_id, doctor_id, consultation_date, mode, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, doctor_id, consultation_date, mode, notes]
    );

    res.status(201).json({ 
      message: 'Consultation booked successfully',
      consultationId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Booking failed', details: err.message });
  }
});

app.get('/api/consultations', authenticate, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'patient') {
      query = `
        SELECT c.*, d.specialty, u.full_name as doctor_name 
        FROM consultations c 
        JOIN doctor_profiles d ON c.doctor_id = d.user_id 
        JOIN users u ON c.doctor_id = u.id 
        WHERE c.patient_id = ?
      `;
      params = [req.user.id];
    } else if (req.user.role === 'doctor') {
      query = `
        SELECT c.*, u.full_name as patient_name 
        FROM consultations c 
        JOIN users u ON c.patient_id = u.id 
        WHERE c.doctor_id = ?
      `;
      params = [req.user.id];
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [consultations] = await pool.execute(query, params);
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consultations', details: err.message });
  }
});

app.patch('/api/consultations/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const consultationId = req.params.id;

    await pool.execute(
      'UPDATE consultations SET status = ? WHERE id = ?',
      [status, consultationId]
    );

    res.json({ message: 'Consultation status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// MESSAGING ROUTES
app.post('/api/consultations/:id/messages', authenticate, async (req, res) => {
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
});

app.get('/api/consultations/:id/messages', authenticate, async (req, res) => {
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
});

// SPONSORSHIP ROUTES
app.post('/api/sponsorships', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { treatment_type, goal_amount, description } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO sponsorships (patient_id, treatment_type, goal_amount, description) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, treatment_type, goal_amount, description]
    );

    res.status(201).json({ 
      message: 'Sponsorship campaign created',
      sponsorshipId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
});

app.get('/api/sponsorships', authenticate, async (req, res) => {
  try {
    const [sponsorships] = await pool.execute(
      `SELECT s.*, u.full_name as patient_name, p.age, p.location 
       FROM sponsorships s 
       JOIN users u ON s.patient_id = u.id 
       LEFT JOIN patient_profiles p ON s.patient_id = p.user_id 
       WHERE s.status = 'open'`
    );

    res.json(sponsorships);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsorships', details: err.message });
  }
});

app.post('/api/sponsorships/:id/donate', authenticate, authorize('donor'), async (req, res) => {
  try {
    const { amount, payment_method } = req.body;
    const sponsorshipId = req.params.id;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        `INSERT INTO transactions (sponsorship_id, donor_id, amount, payment_method) 
         VALUES (?, ?, ?, ?)`,
        [sponsorshipId, req.user.id, amount, payment_method]
      );

      await connection.execute(
        `UPDATE sponsorships 
         SET donated_amount = donated_amount + ?, 
             status = CASE WHEN donated_amount + ? >= goal_amount THEN 'funded' ELSE status END 
         WHERE id = ?`,
        [amount, amount, sponsorshipId]
      );

      await connection.commit();
      res.json({ message: 'Donation successful' });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Donation failed', details: err.message });
  }
});

// MEDICINE REQUEST ROUTES
app.post('/api/medicine-requests', authenticate, authorize('patient'), async (req, res) => {
  try {
    const { medicine_name, quantity, urgency } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO medicine_requests (patient_id, medicine_name, quantity, urgency) 
       VALUES (?, ?, ?, ?)`,
      [req.user.id, medicine_name, quantity, urgency]
    );

    res.status(201).json({ 
      message: 'Medicine request created',
      requestId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Request failed', details: err.message });
  }
});

app.get('/api/medicine-requests', authenticate, async (req, res) => {
  try {
    const { status, urgency } = req.query;
    
    let query = `
      SELECT mr.*, u.full_name as patient_name, p.location 
      FROM medicine_requests mr 
      JOIN users u ON mr.patient_id = u.id 
      LEFT JOIN patient_profiles p ON mr.patient_id = p.user_id 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND mr.status = ?';
      params.push(status);
    }

    if (urgency) {
      query += ' AND mr.urgency = ?';
      params.push(urgency);
    }

    query += ' ORDER BY mr.urgency DESC, mr.request_date DESC';

    const [requests] = await pool.execute(query, params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
});

app.patch('/api/medicine-requests/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    await pool.execute(
      'UPDATE medicine_requests SET status = ? WHERE id = ?',
      [status, requestId]
    );

    res.json({ message: 'Request status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// EQUIPMENT ROUTES
app.post('/api/equipment', authenticate, async (req, res) => {
  try {
    const { item_name, description, quantity, location } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO equipment_registry (item_name, description, quantity, location, listed_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [item_name, description, quantity, location, req.user.id]
    );

    res.status(201).json({ 
      message: 'Equipment listed successfully',
      equipmentId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list equipment', details: err.message });
  }
});

app.get('/api/equipment', authenticate, async (req, res) => {
  try {
    const { location } = req.query;
    
    let query = `
      SELECT e.*, u.full_name as listed_by_name 
      FROM equipment_registry e 
      LEFT JOIN users u ON e.listed_by = u.id 
      WHERE e.available = TRUE
    `;
    const params = [];

    if (location) {
      query += ' AND e.location LIKE ?';
      params.push(`%${location}%`);
    }

    const [equipment] = await pool.execute(query, params);
    res.json(equipment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment', details: err.message });
  }
});

// HEALTH GUIDES ROUTES
app.post('/api/health-guides', authenticate, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { title, description, category, language } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO health_guides (title, description, category, language, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, category, language, req.user.id]
    );

    res.status(201).json({ 
      message: 'Health guide created',
      guideId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create guide', details: err.message });
  }
});

app.get('/api/health-guides', async (req, res) => {
  try {
    const { category, language } = req.query;
    
    let query = 'SELECT * FROM health_guides WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    query += ' ORDER BY created_at DESC';

    const [guides] = await pool.execute(query, params);
    res.json(guides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guides', details: err.message });
  }
});

// ALERTS ROUTES
app.post('/api/alerts', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { type, message, region, severity, source } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO alerts (type, message, region, severity, source) 
       VALUES (?, ?, ?, ?, ?)`,
      [type, message, region, severity, source]
    );

    res.status(201).json({ 
      message: 'Alert created',
      alertId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create alert', details: err.message });
  }
});

app.get('/api/alerts', async (req, res) => {
  try {
    const { region, severity } = req.query;
    
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [alerts] = await pool.execute(query, params);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch alerts', details: err.message });
  }
});

// MENTAL HEALTH ROUTES
app.post('/api/mental-health-sessions', authenticate, async (req, res) => {
  try {
    const { counselor_id, session_date, mode, notes } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO mental_health_sessions (user_id, counselor_id, session_date, mode, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, counselor_id, session_date, mode, notes]
    );

    res.status(201).json({ 
      message: 'Session scheduled',
      sessionId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule session', details: err.message });
  }
});

app.get('/api/mental-health-sessions', authenticate, async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      `SELECT mhs.*, u.full_name as counselor_name 
       FROM mental_health_sessions mhs 
       LEFT JOIN users u ON mhs.counselor_id = u.id 
       WHERE mhs.user_id = ? 
       ORDER BY mhs.session_date DESC`,
      [req.user.id]
    );

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
});

// NGO ROUTES
app.post('/api/ngos', authenticate, authorize('admin'), async (req, res) => {
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
});

app.get('/api/ngos', authenticate, async (req, res) => {
  try {
    const [ngos] = await pool.execute(
      'SELECT * FROM ngos WHERE verified = TRUE'
    );

    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch NGOs', details: err.message });
  }
});

app.post('/api/ngo-missions', authenticate, authorize('ngo', 'admin'), async (req, res) => {
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
});

app.get('/api/ngo-missions', authenticate, async (req, res) => {
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
});

// ==================== 5. ERROR HANDLING (Must be LAST!) ====================

// 404 handler - catches any route that wasn't matched above
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler - catches any errors thrown in the app
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== 6. START SERVER ====================

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🏥 HealthPal API Server Started`);
  console.log(`========================================`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🧪 Disease data: http://localhost:${PORT}/api/external/disease-outbreaks`);
  console.log(`========================================`);
});

module.exports = app;