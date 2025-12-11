Project Overview - HealthPal Backend
==================================

This document answers the requested questions about the `healthpal-backend` project, and includes a short Wiki listing implemented features with numbered mapping to the Postman collection endpoints.

1) The used tech or any tool
----------------------------
- **Runtime / Framework**: Node.js with `express` (REST API)
- **ORM / DB Driver**: `sequelize` with `mysql2` (MySQL)
- **Auth & Security**: `jsonwebtoken` (JWT), `bcrypt` for password hashing, `helmet`, `express-rate-limit`, `cors`
- **HTTP Client / Integrations**: `axios`
- **Payments**: `stripe` (Stripe API integration)
- **Translations & External**: Google Translate (via REST), OpenWeatherMap, OpenFDA, disease.sh, NewsAPI, OpenCage, WHO API, Twilio (SMS), SendGrid (email)
- **Validation & Tools**: `express-validator`, `dotenv`, `swagger-jsdoc` + `swagger-ui-express` for API docs
- **Dev / Test**: `nodemon`, `jest`, `supertest`, `eslint`

2) The used architecture, details, and justification
--------------------------------------------------
- **Style**: RESTful API following a modular Model-View-Controller-like layout (routes -> controllers -> utils/services). The main entry points are `src/app.js` and `src/server.js`.
- **Modules**: Each resource has a route file in `src/routes` and a corresponding controller in `src/controllers` (separation of concerns).
- **Middleware**: `src/middleware` contains authentication (`auth.js`), authorization (`authorize.js`), validation (`validation.js`), and logging (`logging.js`). These centralize cross-cutting concerns.
- **External services**: External API logic is encapsulated in `src/config/healthpal_external_apis.js` and `src/utils` helpers (keeps controller code thin).
- **Data access**: Sequelize models (used with `mysql2`) provide schema-driven DB access and migrations; DB schema is defined in `database-schema.sql`.
- **Justification**: This architecture is modular, testable, and extensible. REST + stateless JWT makes horizontal scaling straightforward. Using Sequelize and MySQL offers mature transactional guarantees for donation/payment flows and referential integrity for user-related data.

3) The used DB, and the scheme in detail
----------------------------------------
- **Database engine**: MySQL (database name `healthpal` as in `database-schema.sql`).
- **Access library**: `mysql2` with `sequelize` ORM.
- **Primary tables & highlights** (full DDL available in `database-schema.sql`):
  1. `users` — core user accounts: `id`, `full_name`, `email` (unique), `password_hash`, `role` (ENUM: `patient|doctor|donor|ngo|admin`), `phone`, `verified`, timestamps.
  2. `patient_profiles` — one-to-one patient metadata (`age`, `gender`, `blood_type`, `medical_history`, `location`).
  3. `doctor_profiles` — doctor metadata (`specialty`, `license_no`, `experience_years`, `consultation_fee`, `available`).
  4. `consultations` — bookings: `patient_id`, `doctor_id`, `consultation_date`, `mode`, `status`, `notes`.
  5. Messaging/calls: `messages`, `audio_messages`, `video_messages`, `video_calls`, `audio_calls` (each linked to consultation and sender/initiator).
  6. Donations: `sponsorships`, `transactions` (Stripe ids stored), donation statuses and indices for reporting.
  7. Medicine & equipment: `medicine_requests`, `equipment_registry`, `equipment_requests`.
  8. Health content & alerts: `health_guides`, `alerts`.
  9. Mental health: `mental_health_sessions`, `support_groups`, `support_group_members`, `support_group_messages`, `therapy_resources`, anonymous chat tables.
 10. NGOs & missions: `ngos`, `ngo_missions`.
 11. Logs: `logs` table for audit and admin reporting.

- **Design choices**: normalized tables with foreign keys and cascading deletes for ownership, ENUMs for constrained statuses (keeps code simpler), and indexes for common query patterns (`idx_email`, `idx_role`, `idx_consultation`, `idx_status`, etc.). This supports efficient lookups for scheduling, donation aggregation, and location-based equipment queries.

4) The URI's structure
------------------------
- The API base path used across the codebase and Postman collection is: `{{base_url}}/api`.
- Top-level resource mappings (from `src/routes/index.js`):
  - `/api/auth` — authentication endpoints (register, login, refresh)
  - `/api/users` — profile, change-password, and user-related endpoints
  - `/api/patients` — patient profiles and patient-specific actions
  - `/api/doctors` — doctor profiles and doctor-specific endpoints
  - `/api/consultations` — consultations, messages, audio-calls, video-calls
  - `/api/sponsorships` — sponsorship campaigns and payments
  - `/api/donations` — donation records and history
  - `/api/medicine-requests` — requests for medicines
  - `/api/equipment` and `/api/equipment-requests` — registry and NGO requests
  - `/api/health-guides` — health guides content
  - `/api/alerts` — public/admin alerts
  - `/api/mental-health` — sessions, support groups, resources, anonymous chat
  - `/api/ngos` — NGO registration and approval
  - `/api/external` — proxy endpoints to external services (disease data, medicine info, WHO, webhooks)
  - `/api/translate` — translation endpoints
  - `/api/search` — global search and specialized searches

5) The used External API's
---------------------------
- OpenWeatherMap (air pollution / air-quality)
- Google Translate (translation)
- Twilio (SMS sending)
- OpenFDA (drug/medicine label data)
- disease.sh (disease/outbreak data)
- NewsAPI (health news)
- Stripe (payments)
- OpenCage (geocoding)
- WHO GHO API (global health indicators)
- SendGrid (email)
- Plus internal/mocked prescription validation (placeholder for pharmacy integration)

6) Describe the Github repo
---------------------------
- **Repository**: `ahmadD301/healthpal-backend` (see `package.json` repository field).
- **Top-level layout** (important files/folders):
  - `cli.js`, `bin/cli` — CLI entry used by project tooling
  - `src/` — main source
    - `server.js`, `app.js` — app/server bootstrap
    - `config/` — database and external API configs (`healthpal_external_apis.js`, `healthpal_swagger.js`, `testEnv.js`)
    - `controllers/` — resource controllers
    - `routes/` — Express route definitions (one file per resource)
    - `middleware/` — auth/authorize/validation/logging middleware
    - `utils/` — helper utilities (search, translation service, notification utils, response handler, socket helpers)
  - `tools/` — small scripts (like `check_controllers.js`)
  - `database-schema.sql` — canonical SQL DDL used by the project
  - `healthpal-collection.json` and `healthpal-local.postman_environment.json` — Postman collection + environment
  - `README.md` — high-level project README

7) Describe how you developed your system to handle the problem
-------------------------------------------------------------
- **Problem**: Connect patients, doctors, donors, and NGOs with a set of features (consultations, donations, medicine/equipment requests, mental health support) while supporting translations, external health data, and notifications.
- **Approach**:
  - Authentication & RBAC: JWT-based auth with roles (`patient`, `doctor`, `donor`, `ngo`, `admin`). Middleware enforces protected routes and role checks.
  - Decoupling: Controllers delegate heavy work to `utils` or `config` modules (external APIs, payment handling) to simplify unit testing and maintenance.
  - Resilience: External calls are wrapped in try/catch and return safe fallbacks; background notification batching (via `notificationUtils`) and webhooks for payment events.
  - Data integrity: Use MySQL foreign keys, transactions (when processing donations/payments), and indexes for performance.
  - Observability: `logs` table plus logging middleware to assist debugging and audits.
  - API docs & testing: Swagger for API docs and Jest + Supertest for endpoint tests (scripts configured in `package.json`).

8) Wiki description (also the used tool)
--------------------------------------
This Wiki lists implemented features and maps them to Postman endpoints. Use the included Postman collection (`healthpal-collection.json`) and the Postman environment (`healthpal-local.postman_environment.json`) to run or export the requests.

Feature Index (numbered — match the feature number to the Postman collection groups):

1. Auth
   - Description: User registration, login, token refresh.
   - Endpoints (Postman group `Auth`):
     - POST `/api/auth/register` — Register a new user
     - POST `/api/auth/login` — Login and receive JWT
     - POST `/api/auth/refresh` — Refresh token

2. Users
   - Description: Get/update profile, change password.
   - Endpoints (Postman group `Users`):
     - GET `/api/users/me` — Get current user
     - PUT `/api/users/me` — Update profile
     - POST `/api/users/change-password` — Change password

3. Patients
   - Description: Patient profile management.
   - Endpoints (Postman group `Patients`):
     - GET `/api/patients/:id` — Get patient profile by user id
     - POST `/api/patients/profile` — Create/Update my patient profile

4. Doctors
   - Description: Doctor listing and profile management.
   - Endpoints (Postman group `Doctors`):
     - GET `/api/doctors` — List doctors (supports query params e.g., `?specialty=`)
     - POST `/api/doctors/profile` — Create/Update doctor profile

5. Consultations & Messaging & Calls
   - Description: Booking consultations, in-consultation messaging, audio/video call lifecycle.
   - Endpoints (Postman group `Consultations & Messaging & Calls`):
     - POST `/api/consultations` — Book consultation
     - GET `/api/consultations` — Get my consultations
     - PATCH `/api/consultations/:id/status` — Update consultation status
     - POST `/api/consultations/:id/messages` — Send message
     - GET `/api/consultations/:id/messages` — Get messages
     - POST `/api/consultations/:id/video-calls` — Start video call
     - PATCH `/api/consultations/:id/video-calls/end` — End video call
     - POST `/api/consultations/:id/audio-calls` — Start audio call
     - PATCH `/api/consultations/:id/audio-calls/end` — End audio call

6. Sponsorships & Donations
   - Description: Create sponsorship campaigns and process donations via Stripe.
   - Endpoints (Postman group `Sponsorships & Donations`):
     - POST `/api/sponsorships` — Create sponsorship
     - GET `/api/sponsorships` — List sponsorships
     - GET `/api/sponsorships/:id` — Get sponsorship with donations
     - POST `/api/sponsorships/:id/payment/initiate` — Initiate Stripe payment
     - POST `/api/sponsorships/:id/payment/confirm` — Confirm donation
     - POST `/api/sponsorships/:id/donate` — Legacy donate endpoint
     - POST `/api/donations` — Create donation record
     - GET `/api/donations/history` — My donation history
     - GET `/api/donations/sponsorship/:id` — Donations for a sponsorship
     - GET `/api/donations/stats` — Donation stats (admin)

7. Medicine Requests
   - Description: Patients request medicines and admins/NGOs can update status.
   - Endpoints (Postman group `Medicine Requests`):
     - POST `/api/medicine-requests` — Create medicine request
     - GET `/api/medicine-requests` — List / filter medicine requests
     - PATCH `/api/medicine-requests/:id/status` — Update request status

8. Equipment & Equipment Requests
   - Description: Register equipment, NGO requests, admin views.
   - Endpoints (Postman group `Equipment & Equipment Requests`):
     - POST `/api/equipment` — Create equipment entry
     - GET `/api/equipment` — Get equipment (supports `?location=`)
     - GET `/api/equipment-requests` — NGO: list my equipment requests
     - POST `/api/equipment-requests` — NGO create equipment request
     - PATCH `/api/equipment-requests/:id` — Update equipment request status
     - GET `/api/equipment-requests/admin/all` — Admin: all equipment requests

9. Health Guides & Alerts
   - Description: Publish health guides and broadcast alerts.
   - Endpoints (Postman group `Health Guides & Alerts`):
     - POST `/api/health-guides` — Create health guide
     - GET `/api/health-guides` — List guides (filter by category/language)
     - POST `/api/alerts` — Create alert (admin)
     - GET `/api/alerts` — Get alerts (public filterable)

10. Mental Health
    - Description: Schedule sessions, support groups, resources, anonymous therapy.
    - Endpoints (Postman group `Mental Health`):
      - POST `/api/mental-health/sessions` — Schedule mental health session
      - GET `/api/mental-health/sessions` — Get my sessions
      - POST `/api/mental-health/support-groups` — Create support group
      - GET `/api/mental-health/support-groups` — List support groups
      - POST `/api/mental-health/support-groups/:id/join` — Join
      - POST `/api/mental-health/support-groups/:id/messages` — Send group message
      - GET `/api/mental-health/support-groups/:id/messages` — Get messages
      - POST `/api/mental-health/resources` — Create therapy resource
      - GET `/api/mental-health/resources` — Get resources
      - POST `/api/mental-health/anonymous-chat` — Start anonymous chat

11. NGOs
    - Description: Register and approve NGOs; NGO management.
    - Endpoints (Postman group `NGOs`):
      - POST `/api/ngos` — Register NGO
      - GET `/api/ngos` — Get NGOs
      - GET `/api/ngos/pending` — Get pending NGOs (admin)
      - PATCH `/api/ngos/approve` — Approve NGO (admin)

12. External APIs & Webhooks
    - Description: Proxy external data and accept webhooks (e.g., Stripe).
    - Endpoints (Postman group `External APIs & Webhooks`):
      - GET `/api/external/disease-outbreaks` — Disease/outbreak data
      - GET `/api/external/medicine-info/:name` — Get medicine info (OpenFDA)
      - GET `/api/external/who-health-data` — WHO GHO data
      - POST `/api/external/webhooks/stripe` — Stripe webhook endpoint

13. Translation
    - Description: Translation helper endpoints for medical translation.
    - Endpoints (Postman group `Translation`):
      - GET `/api/translate/supported-languages` — Supported languages
      - GET `/api/translate/health` — Health check
      - POST `/api/translate/text` — Translate text (protected)

14. Search
    - Description: Global and domain-specific search (doctors, suggestions).
    - Endpoints (Postman group `Search`):
      - POST `/api/search` — Global search
      - POST `/api/search/doctors` — Search doctors
      - GET `/api/search/suggestions` — Search suggestions

15. Misc
    - Description: Health check, swagger docs.
    - Endpoints (Postman group `Misc`):
      - GET `/` — API root health check
      - GET `/api-docs` — Swagger UI

References & Files
- Postman collection: `healthpal-collection.json` (located at repository root)
- Postman environment: `healthpal-local.postman_environment.json`
- DB DDL: `database-schema.sql`
- External API helpers: `src/config/healthpal_external_apis.js`
- Routes index: `src/routes/index.js`
---
