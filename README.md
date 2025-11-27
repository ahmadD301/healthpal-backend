# HealthPal - Backend (Node.js + Express + MySQL)

This is the RESTful API backend for **HealthPal**, a medical platform that connects patients, doctors, and NGOs. It supports functionalities such as user authentication, appointment booking, donation tracking, and AI-based medical consultations.

## Tech Stack
- Node.js + Express
- MySQL (via Sequelize ORM)
- Docker & Docker Compose
- Jest (testing)
- Swagger (API documentation)

## Getting Started

```bash
# clone the repo
git clone https://github.com/ahmadD301/healthpal-backend.git
cd healthpal-backend

# install dependencies
npm install

# setup environment
cp .env.example .env

# start development server
npm run dev
