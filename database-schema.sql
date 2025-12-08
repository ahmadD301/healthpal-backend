-- ===================================================
-- HealthPal Database Schema
-- ===================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS healthpal;
USE healthpal;

-- ===================================================
-- 1. USERS TABLE
-- ===================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('patient', 'doctor', 'donor', 'ngo', 'admin') NOT NULL,
  phone VARCHAR(20),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- ===================================================
-- 2. PATIENT PROFILE
-- ===================================================
CREATE TABLE IF NOT EXISTS patient_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  age INT,
  gender ENUM('male', 'female', 'other'),
  blood_type VARCHAR(5),
  medical_history TEXT,
  location VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================================================
-- 3. DOCTOR PROFILE
-- ===================================================
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  specialty VARCHAR(100),
  license_no VARCHAR(100),
  experience_years INT,
  consultation_fee DECIMAL(10, 2),
  available BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===================================================
-- 4. CONSULTATIONS
-- ===================================================
CREATE TABLE IF NOT EXISTS consultations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  consultation_date DATETIME NOT NULL,
  mode ENUM('video', 'audio', 'chat') NOT NULL,
  status ENUM('pending', 'accepted', 'in-progress', 'completed', 'cancelled') DEFAULT 'pending' NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient (patient_id),
  INDEX idx_doctor (doctor_id),
  INDEX idx_date (consultation_date)
);

-- ===================================================
-- 5. MESSAGES (Consultation Text Messages)
-- ===================================================
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation (consultation_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- 5A. AUDIO MESSAGES (Consultation Audio Messages)
-- ===================================================
CREATE TABLE IF NOT EXISTS audio_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  sender_id INT NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  duration_seconds INT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation (consultation_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- 5B. VIDEO MESSAGES (Consultation Video Messages)
-- ===================================================
CREATE TABLE IF NOT EXISTS video_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  sender_id INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  duration_seconds INT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation (consultation_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- 6. VIDEO CALLS
-- ===================================================
CREATE TABLE IF NOT EXISTS video_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  initiator_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NULL,
  duration_seconds INT,
  status ENUM('initiated', 'active', 'completed', 'failed') DEFAULT 'initiated' NOT NULL,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation (consultation_id),
  INDEX idx_initiator (initiator_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 7. AUDIO CALLS
-- ===================================================
CREATE TABLE IF NOT EXISTS audio_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  initiator_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP NULL,
  duration_seconds INT,
  status ENUM('initiated', 'active', 'completed', 'failed') DEFAULT 'initiated' NOT NULL,
  FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  FOREIGN KEY (initiator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_consultation (consultation_id),
  INDEX idx_initiator (initiator_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 8. SPONSORSHIPS
-- ===================================================
CREATE TABLE IF NOT EXISTS sponsorships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  treatment_type VARCHAR(100),
  goal_amount DECIMAL(10, 2) NOT NULL,
  donated_amount DECIMAL(10, 2) DEFAULT 0,
  description TEXT,
  status ENUM('open', 'funded', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient (patient_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 9. TRANSACTIONS (Donations)
-- ===================================================
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sponsorship_id INT NOT NULL,
  donor_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  receipt_url VARCHAR(255),
  status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sponsorship_id) REFERENCES sponsorships(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sponsorship (sponsorship_id),
  INDEX idx_donor (donor_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 10. MEDICINE REQUESTS
-- ===================================================
CREATE TABLE IF NOT EXISTS medicine_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medicine_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'fulfilled') DEFAULT 'pending',
  request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_patient (patient_id),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency)
);

-- ===================================================
-- 11. EQUIPMENT REGISTRY
-- ===================================================
CREATE TABLE IF NOT EXISTS equipment_registry (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(100) NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  location VARCHAR(255),
  available BOOLEAN DEFAULT TRUE,
  listed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_location (location),
  INDEX idx_listed_by (listed_by),
  INDEX idx_available (available)
);

-- ===================================================
-- 11A. EQUIPMENT REQUESTS
-- ===================================================
CREATE TABLE IF NOT EXISTS equipment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ngo_id INT NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  purpose TEXT,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ngo_id (ngo_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 12. HEALTH GUIDES
-- ===================================================
CREATE TABLE IF NOT EXISTS health_guides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  language ENUM('ar', 'en') DEFAULT 'en',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_language (language),
  INDEX idx_created_by (created_by)
);

-- ===================================================
-- 13. ALERTS
-- ===================================================
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(100),
  message TEXT NOT NULL,
  region VARCHAR(100),
  severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_region (region),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at)
);

-- ===================================================
-- 14. MENTAL HEALTH SESSIONS
-- ===================================================
CREATE TABLE IF NOT EXISTS mental_health_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  counselor_id INT,
  session_date DATETIME NOT NULL,
  mode ENUM('chat', 'audio', 'video') DEFAULT 'chat',
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_counselor (counselor_id),
  INDEX idx_session_date (session_date),
  INDEX idx_status (status)
);

-- ===================================================
-- 15. NGOs
-- ===================================================
CREATE TABLE IF NOT EXISTS ngos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_verified (verified),
  INDEX idx_user_id (user_id)
);

-- ===================================================
-- 16. NGO MISSIONS
-- ===================================================
CREATE TABLE IF NOT EXISTS ngo_missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ngo_id INT NOT NULL,
  mission_type VARCHAR(100) NOT NULL,
  mission_date DATETIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  doctor_needed BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE,
  INDEX idx_ngo (ngo_id),
  INDEX idx_mission_date (mission_date),
  INDEX idx_location (location),
  INDEX idx_mission_type (mission_type)
);

-- ===================================================
-- 17. LOGS
-- ===================================================
CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255),
  ip_address VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_timestamp (timestamp)
);

-- ===================================================
-- 18. SUPPORT GROUPS
-- ===================================================
CREATE TABLE IF NOT EXISTS support_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at)
);

-- ===================================================
-- 19. SUPPORT GROUP MEMBERS
-- ===================================================
CREATE TABLE IF NOT EXISTS support_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES support_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (group_id, user_id),
  INDEX idx_group (group_id),
  INDEX idx_user (user_id)
);

-- ===================================================
-- 20. SUPPORT GROUP MESSAGES
-- ===================================================
CREATE TABLE IF NOT EXISTS support_group_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES support_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_group (group_id),
  INDEX idx_sender (sender_id),
  INDEX idx_sent_at (sent_at)
);

-- ===================================================
-- 21. THERAPY RESOURCES
-- ===================================================
CREATE TABLE IF NOT EXISTS therapy_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100),
  resource_url VARCHAR(500),
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_type (resource_type),
  INDEX idx_created_by (created_by)
);

-- ===================================================
-- 22. ANONYMOUS THERAPY CHAT
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_therapy_chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  counselor_id INT,
  status ENUM('active', 'closed') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 23. ANONYMOUS CHAT MESSAGES
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES anonymous_therapy_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat (chat_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- 24. ANONYMOUS AUDIO THERAPY CHATS
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_audio_therapy_chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  counselor_id INT,
  status ENUM('active', 'closed') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 25. ANONYMOUS AUDIO MESSAGES
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_audio_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  audio_url VARCHAR(500) NOT NULL,
  duration_seconds INT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES anonymous_audio_therapy_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat (chat_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- 26. ANONYMOUS VIDEO THERAPY CHATS
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_video_therapy_chats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  counselor_id INT,
  status ENUM('active', 'closed') DEFAULT 'active',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (counselor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);

-- ===================================================
-- 27. ANONYMOUS VIDEO MESSAGES
-- ===================================================
CREATE TABLE IF NOT EXISTS anonymous_video_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  duration_seconds INT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES anonymous_video_therapy_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_chat (chat_id),
  INDEX idx_sender (sender_id)
);

-- ===================================================
-- Create Indexes for Better Performance
-- ===================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_consultations_patient_date ON consultations(patient_id, consultation_date);
CREATE INDEX idx_sponsorships_status ON sponsorships(status);
CREATE INDEX idx_equipment_availability ON equipment_registry(available);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_audio_messages_consultation ON audio_messages(consultation_id);
CREATE INDEX idx_video_messages_consultation ON video_messages(consultation_id);
CREATE INDEX idx_anonymous_audio_messages_chat ON anonymous_audio_messages(chat_id);
CREATE INDEX idx_anonymous_video_messages_chat ON anonymous_video_messages(chat_id);

-- ===================================================
-- MIGRATIONS / ALTERATIONS
-- ===================================================

-- Migration 1: Add user_id to ngos table
ALTER TABLE ngos ADD COLUMN IF NOT EXISTS user_id INT AFTER id;
ALTER TABLE ngos ADD CONSTRAINT IF NOT EXISTS fk_ngos_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE ngos ADD INDEX IF NOT EXISTS idx_user_id (user_id);

-- Migration 2: Add donation fields to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'completed', 'failed') DEFAULT 'completed';

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

ALTER TABLE transactions 
ADD INDEX IF NOT EXISTS idx_status (status);

-- ===================================================
-- END OF SCHEMA (27 TABLES TOTAL)
-- ===================================================