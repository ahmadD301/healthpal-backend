const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logRequest = require('./middleware/logging');
const routes = require('./routes');

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date() });
});

app.use(logRequest);

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
