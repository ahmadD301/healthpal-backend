# HealthPal - Project Overview

## What is HealthPal?

HealthPal is a comprehensive **telemedicine and medical management platform** that connects:
- **Patients** seeking medical consultations and support
- **Doctors** offering professional healthcare services
- **NGOs** organizing medical missions and volunteer work
- **Donors** supporting patients through sponsorships

## Core Features

### 1. 🏥 Telemedicine Consultations

**Video/Audio/Chat Consultations**
- Book appointments with qualified doctors
- Three consultation modes: video calls, audio calls, or text chat
- Doctor acceptance workflow ensures confirmed appointments
- Real-time messaging for chat-based consultations
- Call history tracking with duration monitoring

**Workflow:**
```
Patient Books → Doctor Accepts → Call/Chat → Completed
```

### 2. 👨⚕️ Doctor Management

**Doctor Profiles**
- Specialties and qualifications
- Consultation fees
- Availability status
- Experience tracking
- License verification

**Doctor Dashboard**
- View assigned consultations
- Accept/reject appointments
- Manage video/audio calls
- Message patients
- Track consultation history

### 3. 👤 Patient Management

**Patient Profiles**
- Health history
- Medical conditions
- Blood type and allergies
- Location information
- Emergency contacts

**Patient Dashboard**
- Book consultations
- View consultation status
- Start/end calls
- Message doctors
- Track health records

### 4. 💊 Medical Management

**Medicine Requests**
- Request medications with urgency levels
- Track request status
- Manage inventory
- Integration with pharmacies

**Equipment Registry**
- Track medical equipment
- Availability management
- Lending/borrowing system
- Location tracking

**Health Guides**
- Educational content
- Disease prevention
- Symptom checking
- Wellness tips

### 5. 💰 Donations & Sponsorships

**Sponsorship Campaigns**
- Patients create fundraising campaigns
- Donors contribute financially
- Track donation progress
- Transparent fund management

**Payment Integration**
- Stripe payment processing
- Multiple payment methods
- Secure transactions
- Receipt generation

### 6. 🤝 NGO Missions

**Mission Management**
- Create and track NGO missions
- Medical missions
- Supply delivery missions
- Volunteer coordination
- Location-based tracking

**Mission Types**
- Medical: Healthcare services
- Supply: Equipment and medicine delivery
- Volunteer: Coordination and recruitment

### 7. 🧠 Mental Health Support

**Mental Health Resources**
- Therapy session booking
- Crisis support hotlines
- Mental health guides
- Wellness content
- Counselor directory

### 8. 📨 Messaging & Alerts

**Real-Time Messaging**
- Patient-doctor communication
- Chat history
- File sharing capability
- Notification system

**Health Alerts**
- Important health reminders
- Medication alerts
- Appointment reminders
- Emergency notifications

### 9. 🌐 External Integrations

**7 Integrated External APIs:**
1. **WHO (World Health Organization)** - Health statistics and data
2. **Google Translate** - Multi-language support with fallback dictionary
3. **OpenFDA** - Drug and adverse event information
4. **Stripe** - Payment processing
5. **SendGrid/Nodemailer** - Email notifications
6. **Twilio** - SMS and voice services
7. **Disease.sh** - COVID-19 and epidemic statistics

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HealthPal Platform                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼──┐            ┌─────▼──┐          ┌──────▼───┐
    │ Web  │            │  CLI   │          │ Mobile   │
    │ App  │            │ Tool   │          │   App    │
    └───┬──┘            └────┬───┘          └────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │    Node.js + Express.js    │
              │      REST API Server       │
              │   (50+ Endpoints)          │
              └──────────────┬──────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼──────┐        ┌────▼───┐      ┌────────▼────┐
    │  MySQL   │        │  JWT   │      │  External   │
    │ Database │        │  Auth  │      │   APIs      │
    │(27 Tables)│        └────────┘      └─────────────┘
    └──────────┘
```

## User Roles

### 1. Patient
- Book consultations
- Manage health records
- Send/receive messages
- Create sponsorship campaigns
- Request medicines and equipment
- Access mental health resources
- Receive health alerts

### 2. Doctor
- Manage consultations
- Accept/reject appointments
- Conduct video/audio calls
- Message patients
- Create health guides
- Provide mental health support
- View patient histories

### 3. NGO
- Create and manage missions
- Recruit volunteers
- Track supplies
- Report on mission outcomes
- Coordinate medical services
- Manage campaigns

### 4. Donor
- Create fundraising campaigns
- Contribute to sponsorships
- Track donation impact
- Download receipts
- View supported causes

### 5. Admin
- User management
- System monitoring
- Report generation
- Content moderation
- Payment administration
- Access control management

## Data Flow

### Consultation Booking Flow

```
Patient Book
    ↓
Create Consultation (status: pending)
    ↓
Doctor Notification
    ↓
Doctor View Consultation
    ↓
Doctor Accept (status: accepted)
    ↓
Patient Notified
    ↓
Patient Can Start Call
    ↓
Video/Audio Call (status: active)
    ↓
Call Ends (status: completed)
    ↓
Call History Recorded
```

### Payment Flow

```
Patient Creates Sponsorship
    ↓
Donor Views Campaign
    ↓
Donor Selects Payment Method
    ↓
Stripe Processes Payment
    ↓
Payment Confirmed
    ↓
Funds Transferred
    ↓
Receipt Generated
    ↓
Donor & Patient Notified
```

## Database Architecture

**27+ Tables** organized by module:

```
Authentication
├── users (main user table)
└── tokens (session tokens)

Consultations
├── consultations (appointment records)
├── video_calls (video call history)
├── audio_calls (audio call history)
└── messages (chat messages)

User Profiles
├── patient_profiles
├── doctor_profiles
├── ngo_profiles
└── donor_profiles

Medical
├── medicines (medicine inventory)
├── medicine_requests
├── equipment (equipment registry)
├── equipment_requests
└── health_guides

Financial
├── sponsorships (campaign records)
├── transactions (payment records)
└── donations (donation tracking)

NGO
├── ngo_missions
├── mission_volunteers
└── mission_reports

Other
├── alerts (health alerts)
├── mental_health (therapy sessions)
└── search_logs (activity tracking)
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 16+ | JavaScript execution |
| **Framework** | Express.js 5.0 | Web server & routing |
| **Database** | MySQL 8.0 | Data persistence |
| **ORM** | Sequelize 6.0 | Database abstraction |
| **Authentication** | JWT | Token-based auth |
| **Security** | Helmet, bcrypt | Security headers & hashing |
| **Payments** | Stripe | Payment processing |
| **API Docs** | Swagger/OpenAPI | Interactive documentation |
| **Testing** | Jest | Unit & integration tests |
| **Validation** | express-validator | Input validation |
| **Rate Limiting** | express-rate-limit | API protection |
| **CORS** | CORS middleware | Cross-origin requests |

## Key Statistics

| Metric | Value |
|--------|-------|
| **Controllers** | 21 |
| **API Routes** | 21 |
| **Database Tables** | 27+ |
| **API Endpoints** | 50+ |
| **External APIs** | 7 |
| **User Roles** | 5 |
| **Modules** | 10+ |
| **Lines of Code** | 10,000+ |

## Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Role-Based Access Control** - RBAC per endpoint
- ✅ **Data Isolation** - Users only see their data
- ✅ **CORS Protection** - Cross-origin request control
- ✅ **Rate Limiting** - API abuse prevention
- ✅ **Input Validation** - Sanitization & validation
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **HTTPS Support** - Encrypted communication
- ✅ **Helmet Middleware** - Security headers

## Performance Features

- ✅ **Connection Pooling** - Efficient DB connections
- ✅ **Query Optimization** - Indexed tables
- ✅ **Caching** - Response caching
- ✅ **Pagination** - Large result set handling
- ✅ **Compression** - Response compression
- ✅ **Async Processing** - Non-blocking operations

## Scalability

HealthPal is built for growth:

- **Horizontal Scaling** - Stateless servers
- **Database Scaling** - Connection pooling
- **Load Balancing** - Ready for load balancers
- **Microservices Ready** - Modular architecture
- **API Rate Limiting** - Fair usage
- **Caching Strategy** - Reduced DB queries

## Compliance

- ✅ **HIPAA Ready** - Health data protection
- ✅ **GDPR Compliant** - Data privacy regulations
- ✅ **Data Encryption** - In transit and at rest
- ✅ **Audit Logging** - Activity tracking
- ✅ **Data Backup** - Regular backups

## Use Cases

### Healthcare Provider
Use HealthPal to offer telemedicine services, manage patient relationships, and coordinate with NGOs for outreach programs.

### Medical NGO
Organize medical missions, coordinate volunteers, track supplies, and report outcomes efficiently.

### Patient
Access healthcare services remotely, manage medical records, seek sponsorship for treatments, and connect with support communities.

### Donor
Support patients' medical journeys, track donation impact, and manage tax-deductible contributions.

## Market Advantage

- **All-in-One Platform** - Consultations, payments, NGO coordination
- **Scalable Architecture** - From startup to enterprise
- **Multi-Language Support** - Google Translate integration
- **Secure & Compliant** - HIPAA and GDPR ready
- **Easy Integration** - REST API with Swagger docs
- **Real-Time Features** - Messaging and alerts
- **Payment Ready** - Stripe integration built-in

## Future Roadmap

- [ ] AI-powered health recommendations
- [ ] Wearable device integration
- [ ] Blockchain for medical records
- [ ] Expanded payment methods
- [ ] Multi-language mobile apps
- [ ] Advanced analytics dashboard
- [ ] Telemedicine video streaming optimization
- [ ] IoT medical device support

## Getting Started

1. **[Installation](./WIKI_INSTALLATION.md)** - Set up locally
2. **[Quick Start](./WIKI_QUICK_START.md)** - 5-minute intro
3. **[API Reference](./WIKI_API_ENDPOINTS.md)** - All endpoints
4. **[CLI Guide](./WIKI_CLI.md)** - Test with CLI

## Support & Documentation

- 📖 [Complete Wiki](./WIKI_HOME.md) - Full documentation
- 🐛 [Troubleshooting](./WIKI_TROUBLESHOOTING.md) - Common issues
- 🔧 [Development Guide](./WIKI_DEVELOPMENT.md) - Contributing
- 📋 [API Docs](http://localhost:3000/api-docs) - Swagger UI

---

**Built with ❤️ for healthcare providers and patients worldwide**  
**Version**: 1.0.0 | **Last Updated**: December 11, 2025
