const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to HealthPal API',
    version: '1.0.0',
    status: 'running'
  });
});

// API routes will be mounted from server.js
app.use('/api/docs', (req, res) => {
  res.send('API Documentation: Visit /api-docs for Swagger UI');
});

module.exports = app;
