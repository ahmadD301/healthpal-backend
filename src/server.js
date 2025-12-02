const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
require('dotenv').config();

const routes = require('./routes');
const { logger, errorHandler } = require('./middleware/logging');
const { responseHandler } = require('./utils/responseHandler');
const swaggerOptions = require('./config/healthpal_swagger');

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0 && NODE_ENV === 'production') {
  console.error(`❌ Missing critical environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize Express app
const app = express();

// ==================== SECURITY MIDDLEWARE ====================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting - Authentication endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// ==================== BODY PARSER MIDDLEWARE ====================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==================== LOGGING & RESPONSE HANDLER MIDDLEWARE ====================

app.use(logger);
app.use(responseHandler);

// ==================== API RATE LIMITING ====================

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== HEALTH CHECK & ROOT ENDPOINTS ====================

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HealthPal API',
    version: '1.0.0',
    status: 'running',
    environment: NODE_ENV,
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

// ==================== SWAGGER DOCUMENTATION ====================

const specs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  swaggerOptions: {
    url: '/api-docs.json'
  }
}));

// Serve OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// ==================== API ROUTES ====================

app.use('/api', routes);

// ==================== 404 HANDLER ====================

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ==================== GLOBAL ERROR HANDLER ====================

app.use(errorHandler);

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🏥 HealthPal API Server');
  console.log('========================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔐 CORS Origin: ${corsOptions.origin}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`💓 Health Check: http://localhost:${PORT}/`);
  console.log('========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;