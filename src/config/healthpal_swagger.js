const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HealthPal API',
      version: '1.0.0',
      description: 'Comprehensive digital healthcare platform REST API for Palestinian healthcare access',
      contact: {
        name: 'HealthPal Support',
        email: 'support@healthpal.example'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.healthpal.example',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            full_name: { type: 'string', example: 'Ahmad Hassan' },
            email: { type: 'string', format: 'email', example: 'ahmad@example.com' },
            role: { 
              type: 'string', 
              enum: ['patient', 'doctor', 'donor', 'ngo', 'admin'],
              example: 'patient'
            },
            phone: { type: 'string', example: '+970599123456' },
            verified: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        PatientProfile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            age: { type: 'integer', example: 32 },
            gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
            blood_type: { type: 'string', example: 'A+' },
            medical_history: { type: 'string', example: 'Diabetes Type 2' },
            location: { type: 'string', example: 'Ramallah, West Bank' }
          }
        },
        DoctorProfile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            specialty: { type: 'string', example: 'Internal Medicine' },
            license_no: { type: 'string', example: 'PS-MED-12345' },
            experience_years: { type: 'integer', example: 8 },
            consultation_fee: { type: 'number', format: 'decimal', example: 50.00 },
            available: { type: 'boolean', example: true }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patient_id: { type: 'integer' },
            doctor_id: { type: 'integer' },
            consultation_date: { type: 'string', format: 'date-time' },
            mode: { type: 'string', enum: ['video', 'audio', 'chat'], example: 'video' },
            status: { 
              type: 'string', 
              enum: ['pending', 'accepted', 'completed', 'cancelled'],
              example: 'pending'
            },
            notes: { type: 'string', example: 'Severe headaches' }
          }
        },
        Sponsorship: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patient_id: { type: 'integer' },
            treatment_type: { type: 'string', example: 'Kidney Dialysis' },
            goal_amount: { type: 'number', format: 'decimal', example: 5000.00 },
            donated_amount: { type: 'number', format: 'decimal', example: 1500.00 },
            description: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['open', 'funded', 'closed'],
              example: 'open'
            }
          }
        },
        MedicineRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            patient_id: { type: 'integer' },
            medicine_name: { type: 'string', example: 'Insulin (Lantus)' },
            quantity: { type: 'integer', example: 5 },
            urgency: { 
              type: 'string', 
              enum: ['low', 'medium', 'high'],
              example: 'high'
            },
            status: { 
              type: 'string', 
              enum: ['pending', 'in_progress', 'fulfilled'],
              example: 'pending'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            details: { type: 'string', example: 'Additional error information' }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User profile management' },
      { name: 'Patients', description: 'Patient profile operations' },
      { name: 'Doctors', description: 'Doctor profile and availability' },
      { name: 'Consultations', description: 'Medical consultation booking and management' },
      { name: 'Messaging', description: 'Chat messaging within consultations' },
      { name: 'Sponsorships', description: 'Treatment funding campaigns' },
      { name: 'Medicine Requests', description: 'Medicine delivery coordination' },
      { name: 'Equipment', description: 'Medical equipment registry' },
      { name: 'Health Guides', description: 'Educational health content' },
      { name: 'Alerts', description: 'Public health alerts' },
      { name: 'Mental Health', description: 'Counseling and therapy sessions' },
      { name: 'NGOs', description: 'NGO and medical mission management' }
    ]
  },
  apis: ['./server.js', './routes/*.js'] // Path to API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = { swaggerUi, swaggerDocs };