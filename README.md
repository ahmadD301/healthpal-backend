# HealthPal Backend

A comprehensive RESTful API backend for HealthPal, a medical platform connecting patients, doctors, and NGOs. The system enables telemedicine consultations, medical equipment tracking, medication management, donations, sponsorships, and mental health support.

## Overview

HealthPal Backend provides a complete suite of healthcare services:
- User authentication and role-based access control (Patients, Doctors, NGOs, Admins)
- Online consultations and appointment booking
- Patient and doctor profile management
- Medical equipment and medicine inventory tracking
- Donation and sponsorship management
- Mental health support and resources
- Health guides and medical alerts
- Real-time messaging between users
- Integration with external APIs
- Payment processing via Stripe

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest
- **API Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, bcrypt, Rate Limiting
- **Payment Processing**: Stripe
- **Deployment**: Docker & Docker Compose

## Project Structure

```
healthpal-backend/
├── bin/                    # CLI utilities
├── migrations/             # Database migrations
├── src/
│   ├── app.js             # Express app configuration
│   ├── server.js          # Server entry point
│   ├── config/            # Configuration files
│   │   ├── database.js
│   │   ├── healthpal_external_apis.js
│   │   ├── healthpal_swagger.js
│   │   └── testEnv.js
│   ├── controllers/       # Business logic
│   │   ├── alertController.js
│   │   ├── authController.js
│   │   ├── consultationController.js
│   │   ├── doctorController.js
│   │   ├── donationController.js
│   │   ├── equipmentController.js
│   │   ├── externalApiController.js
│   │   ├── healthGuideController.js
│   │   ├── medicineController.js
│   │   ├── mentalHealthController.js
│   │   ├── messageController.js
│   │   ├── ngoController.js
│   │   ├── patientController.js
│   │   ├── sponsorshipController.js
│   │   └── userController.js
│   ├── middleware/        # Express middleware
│   │   ├── auth.js
│   │   ├── authorize.js
│   │   ├── logging.js
│   │   └── validation.js
│   ├── models/            # Sequelize models
│   │   ├── DoctorProfile.js
│   │   ├── PatientProfile.js
│   │   └── user.js
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   │   ├── externalApis.js
│   │   ├── notificationUtils.js
│   │   ├── paymentUtils.js
│   │   ├── responseHandler.js
│   │   └── socket.js
│   └── tools/             # Development tools
└── package.json
```

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- MySQL 8.0 or higher
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ahmadD301/healthpal-backend.git
cd healthpal-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with:
   - Database credentials
   - JWT secret
   - API keys for external services
   - Stripe keys
   - Email service credentials

5. Run database migrations:
```bash
npm run cli migrate
```

## Running the Application

### Development Mode
```bash
npm run dev
```
Server will start at `http://localhost:3000` with hot-reload enabled.

### Production Mode
```bash
npm start
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run cli` - Run CLI commands
- `npm run check:controllers` - Check controllers for issues

## API Documentation

Interactive API documentation is available via Swagger UI at:
```
http://localhost:3000/api-docs
```

## Core Features

### Authentication & Authorization
- User registration and login
- JWT-based authentication
- Role-based access control (RBAC)
- Token refresh mechanism

### Consultations
- Schedule and manage appointments
- Real-time messaging during consultations
- Consultation history and records

### User Profiles
- Patient profiles with medical history
- Doctor profiles with specializations
- NGO profiles for organizational management

### Healthcare Resources
- Medical equipment tracking
- Medicine inventory management
- Health guides and educational resources
- Mental health support and counseling

### Donations & Sponsorships
- Donation tracking and management
- Sponsorship programs
- Payment integration via Stripe

### Alerts & Notifications
- Medical alerts
- Real-time notifications
- Alert management system

### External API Integration
- Integration with third-party healthcare APIs
- Data synchronization

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- CORS protection
- Helmet.js for HTTP headers security
- Rate limiting on API endpoints
- Input validation and sanitization
- Role-based access control

## Error Handling

The API uses consistent error responses with appropriate HTTP status codes. All errors include:
- Error message
- Error code
- Request ID for tracking

## Database

The application uses MySQL with Sequelize ORM. Database schema includes:
- Users table (with role-based differentiation)
- Patient and Doctor profiles
- Consultations and appointments
- Donations and sponsorships
- Equipment and medicines
- Mental health records
- Messages and alerts

Run migrations:
```bash
npm run cli migrate
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m 'Add your feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a pull request

## API Endpoints Summary

### Authentication
- POST `/auth/register` - Register new user
- POST `/auth/login` - Login user
- POST `/auth/refresh-token` - Refresh access token

### Consultations
- GET `/consultations` - List consultations
- POST `/consultations` - Create consultation
- GET `/consultations/:id` - Get consultation details
- PUT `/consultations/:id` - Update consultation

### Users
- GET `/users` - List users
- GET `/users/:id` - Get user profile
- PUT `/users/:id` - Update user profile

### Doctors
- GET `/doctors` - List all doctors
- GET `/doctors/:id` - Get doctor details
- POST `/doctors` - Create doctor profile

### Patients
- GET `/patients` - List all patients
- GET `/patients/:id` - Get patient details
- POST `/patients` - Create patient profile

### Donations
- GET `/donations` - List donations
- POST `/donations` - Create donation
- GET `/donations/:id` - Get donation details

### Sponsorships
- GET `/sponsorships` - List sponsorships
- POST `/sponsorships` - Create sponsorship

### Equipment
- GET `/equipment` - List equipment
- POST `/equipment` - Add equipment
- PUT `/equipment/:id` - Update equipment

### Medicines
- GET `/medicines` - List medicines
- POST `/medicines` - Add medicine
- PUT `/medicines/:id` - Update medicine

### NGOs
- GET `/ngos` - List NGOs
- POST `/ngos` - Create NGO
- GET `/ngos/:id` - Get NGO details

### Mental Health
- GET `/mental-health` - Get mental health resources
- POST `/mental-health` - Create resource

### Health Guides
- GET `/health-guides` - List health guides
- POST `/health-guides` - Create guide

### Alerts
- GET `/alerts` - List alerts
- POST `/alerts` - Create alert

### Messages
- GET `/messages` - List messages
- POST `/messages` - Send message

## License

ISC

## Repository

[GitHub Repository](https://github.com/ahmadD301/healthpal-backend)

## Support

For issues and questions, please create an issue on the GitHub repository.
