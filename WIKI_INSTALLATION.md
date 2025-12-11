# HealthPal - Installation & Setup Guide

## Prerequisites

Before installing HealthPal, ensure you have:

- **Node.js** 16.0 or higher
- **npm** 7.0 or higher (comes with Node.js)
- **MySQL** 8.0 or higher
- **Git** 2.0 or higher
- **Postman** or **Insomnia** (optional, for API testing)

### System Requirements

- **OS**: Windows, macOS, or Linux
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 500MB free space
- **Network**: Internet connection required for external API integrations

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ahmadD301/healthpal-backend.git
cd healthpal-backend
```

### 2. Install Node Dependencies

```bash
npm install
```

This installs all required packages from `package.json`:
- Express.js (web framework)
- MySQL2 (database driver)
- Sequelize (ORM)
- JWT (authentication)
- Stripe (payments)
- And more...

**Expected Output:**
```
added XXX packages in X.XXs
```

### 3. Create Environment Configuration

Create a `.env` file in the root directory:

```bash
# Duplicate the example
cp .env.example .env  # or manually create it
```

### 4. Configure Database Connection

Edit `.env` and set:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=healthpal_db
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# External APIs
GOOGLE_TRANSLATE_API_KEY=your_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLIC_KEY=your_stripe_public_key

# Email/Notifications
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### 5. Create MySQL Database

```bash
# Open MySQL client
mysql -u root -p

# Create database
CREATE DATABASE healthpal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit MySQL
EXIT;
```

### 6. Run Database Migrations/Setup

```bash
# Initialize database tables
npm run init:db

# Or manually import SQL schema
mysql -u root -p healthpal_db < database-schema.sql
```

### 7. Verify Installation

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check MySQL connection
mysql -u root -p -e "SELECT VERSION();"
```

## Starting the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

Expected output:
```
Server running on http://localhost:3000
Database connected successfully
```

### Production Mode

```bash
npm start
```

### CLI Mode (for testing)

```bash
npm run cli
```

This opens the interactive command-line interface for testing without API calls.

## Directory Structure After Installation

```
healthpal-backend/
├── node_modules/          # Dependencies (created after npm install)
├── src/
│   ├── controllers/       # Business logic
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── config/            # Configuration files
│   ├── utils/             # Helper functions
│   ├── app.js             # Express app setup
│   └── server.js          # Server entry point
├── migrations/            # Database migrations
├── cli.js                 # CLI application
├── package.json           # Dependencies list
├── .env                   # Environment variables (create this)
└── README.md              # Original README
```

## Verification Checklist

After installation, verify:

- [ ] Node.js installed (`node -v`)
- [ ] npm installed (`npm -v`)
- [ ] Dependencies installed (`ls node_modules | wc -l`)
- [ ] MySQL running (`mysql -u root -p`)
- [ ] Database created (`SHOW DATABASES;`)
- [ ] .env file configured
- [ ] Server starts without errors (`npm run dev`)
- [ ] API is accessible (`curl http://localhost:3000`)

## Common Installation Issues

### Issue 1: "npm: command not found"
**Solution**: Install Node.js from https://nodejs.org/

### Issue 2: "Cannot find module 'express'"
**Solution**: Run `npm install` from the project root directory

### Issue 3: "ECONNREFUSED 127.0.0.1:3306"
**Solution**: MySQL server not running. Start it:
```bash
# Windows
net start MySQL80

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Issue 4: "Access denied for user 'root'@'localhost'"
**Solution**: Check MySQL credentials in .env file

### Issue 5: Database doesn't exist
**Solution**: 
```bash
mysql -u root -p
CREATE DATABASE healthpal_db;
EXIT;
```

## Quick Start Commands Reference

```bash
# Install everything
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run CLI
npm run cli

# Check controllers structure
npm run check:controllers

# Run tests (if configured)
npm test

# Run tests in watch mode
npm test:watch
```

## Database Initial Setup

### Create Tables

```sql
-- Run this SQL to create all tables
mysql -u root -p healthpal_db < database-schema.sql
```

### Insert Sample Data

```bash
# Optional: Add sample doctors, patients, etc.
mysql -u root -p healthpal_db < sample-data.sql
```

## First Login

### Create Test Accounts

Use the CLI or API to register:

**Patient Account:**
```
Email: patient@example.com
Password: Patient123!
Role: patient
```

**Doctor Account:**
```
Email: doctor@example.com
Password: Doctor123!
Role: doctor
```

**NGO Account:**
```
Email: ngo@example.com
Password: NGO123!
Role: ngo
```

## API Documentation

### Access Swagger Documentation

1. Start the server: `npm run dev`
2. Open browser: `http://localhost:3000/api-docs`
3. Interactive API documentation opens

### Test API Endpoints

Use Postman/Insomnia:
1. Import: `healthpal-collection.json`
2. Set Environment: `healthpal-local.postman_environment.json`
3. Test endpoints

## Next Steps

After successful installation:

1. **Read [Quick Start Guide](./WIKI_QUICK_START.md)** - Learn basic operations
2. **Check [API Endpoints](./WIKI_API_ENDPOINTS.md)** - Understand available endpoints
3. **Review [CLI Guide](./WIKI_CLI.md)** - Test using command line
4. **Set up [External Integrations](./WIKI_INTEGRATIONS.md)** - Configure third-party services

## Troubleshooting

For more help, see:
- [Troubleshooting Guide](./WIKI_TROUBLESHOOTING.md)
- [Development Setup](./WIKI_DEVELOPMENT.md)
- Original [README.md](./README.md)

## Support

- **Documentation**: See [Wiki Home](./WIKI_HOME.md)
- **Issues**: GitHub Issues
- **Community**: GitHub Discussions

---

**Last Updated**: December 11, 2025  
**Version**: 1.0.0
