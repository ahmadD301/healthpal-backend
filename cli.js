#!/usr/bin/env node
/*
  HealthPal CLI - Role-Based API Testing Tool
  Supports: Patient, Doctor, Donor, NGO, Admin
  Features: Role-based menus, proper authorization, all assignment features
*/

const readline = require('readline');
const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

let authToken = null;
let currentUser = null;

const prompt = (q) => new Promise((res) => rl.question(q, (a) => res(a.trim())));
const authHeaders = () => authToken ? { Authorization: `Bearer ${authToken}` } : {};

// Helper function to format dates for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  } catch (e) {
    return dateString;
  }
};

// ============== AUTH FUNCTIONS ==============
async function register() {
  console.log('\n--- Register ---');
  const full_name = await prompt('Full name: ');
  const email = await prompt('Email: ');
  const password = await prompt('Password (8+ chars, upper, lower, digit): ');
  const phone = await prompt('Phone: ');
  const role = await prompt('Role (patient/doctor/donor/ngo/admin) [patient]: ') || 'patient';

  try {
    const res = await axios.post(`${API_BASE}/auth/register`, 
      { full_name, email, password, phone, role }, 
      { timeout: 5000 }
    );
    console.log('✓ Registered. User ID:', res.data.userId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function login() {
  console.log('\n--- Login ---');
  const email = await prompt('Email: ');
  const password = await prompt('Password: ');

  try {
    const res = await axios.post(`${API_BASE}/auth/login`, 
      { email, password }, 
      { timeout: 5000 }
    );
    authToken = res.data.token;
    currentUser = res.data.user;
    console.log(`✓ Welcome, ${currentUser.full_name}! (${currentUser.role})`);
  } catch (err) {
    console.error('✗ Login failed:', err.response?.data?.error || err.message);
  }
}

async function logout() {
  authToken = null;
  currentUser = null;
  console.log('✓ Logged out');
}

// ============== COMMON FUNCTIONS ==============
async function viewProfile() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const userRes = await axios.get(`${API_BASE}/users/me`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const user = userRes.data;
    
    console.log('\n--- Your Profile ---');
    console.log(`Name: ${user.full_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Role: ${user.role}`);
    console.log(`Account Status: ${user.verified ? 'Verified' : 'Not Verified'}`);
    console.log(`Member Since: ${new Date(user.created_at).toLocaleDateString()}`);
    
    // If doctor, fetch additional doctor profile info
    if (user.role === 'doctor') {
      try {
        const doctorRes = await axios.get(`${API_BASE}/doctors`, 
          { headers: authHeaders(), timeout: 5000 }
        );
        // Find the current doctor in the list
        const currentDoctor = doctorRes.data.find(d => d.id === user.id);
        
        if (currentDoctor) {
          console.log('\n--- Doctor Profile ---');
          console.log(`Specialty: ${currentDoctor.specialty}`);
          console.log(`License #: ${currentDoctor.license_no}`);
          console.log(`Experience: ${currentDoctor.experience_years} years`);
          console.log(`Consultation Fee: $${currentDoctor.consultation_fee}`);
          console.log(`Status: ${currentDoctor.available ? 'Available' : 'Unavailable'}`);
        }
      } catch (err) {
        console.log('(Doctor profile not yet created)');
      }
    }
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function updateProfile() {
  if (!authToken) return console.log('✗ Login required');
  const full_name = await prompt('New full name (skip to keep): ');
  const phone = await prompt('New phone (skip to keep): ');
  const body = {};
  if (full_name) body.full_name = full_name;
  if (phone) body.phone = phone;
  if (!Object.keys(body).length) return console.log('No changes');

  try {
    await axios.put(`${API_BASE}/users/me`, body, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Profile updated');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function changePassword() {
  if (!authToken) return console.log('✗ Login required');
  const currentPassword = await prompt('Current password: ');
  const newPassword = await prompt('New password: ');
  const confirmPassword = await prompt('Confirm new password: ');

  try {
    await axios.post(`${API_BASE}/users/change-password`, 
      { currentPassword, newPassword, confirmPassword }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Password changed');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== PATIENT FUNCTIONS ==============
async function listDoctors() {
  const specialty = await prompt('Filter by specialty (skip for all): ');
  try {
    const res = await axios.get(`${API_BASE}/doctors`, 
      { params: specialty ? { specialty } : {}, headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Doctors ---');
    console.table(res.data.map(d => ({
      ID: d.id,
      Name: d.full_name,
      Specialty: d.specialty,
      License: d.license_number,
      Fee: `$${d.consultation_fee}`
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function bookConsultation() {
  if (!authToken) return console.log('✗ Login required');
  
  // First, fetch and display available doctors
  try {
    const res = await axios.get(`${API_BASE}/doctors`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const doctors = res.data;
    
    if (doctors.length === 0) {
      console.log('✗ No doctors available');
      return;
    }
    
    console.log('\n--- Available Doctors ---');
    doctors.forEach((d, i) => {
      console.log(`${i + 1}) ${d.full_name} - ${d.specialty} ($${d.consultation_fee}/session)`);
    });
    
    const choice = await prompt('\nSelect doctor (1-' + doctors.length + '): ');
    const doctorIndex = parseInt(choice) - 1;
    
    if (isNaN(doctorIndex) || doctorIndex < 0 || doctorIndex >= doctors.length) {
      return console.log('✗ Invalid selection');
    }
    
    const doctor_id = doctors[doctorIndex].id;
    const consultation_date = await prompt('Date & time (YYYY-MM-DD HH:MM): ');
    const mode = await prompt('Mode (video/audio/chat): ');
    const notes = await prompt('Notes (optional): ');

    const bookRes = await axios.post(`${API_BASE}/consultations`, 
      { doctor_id, consultation_date, mode, notes }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Consultation booked. ID:', bookRes.data.consultationId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewConsultations() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Your Consultations ---');
    console.table(res.data.map(c => ({
      ID: c.id,
      Doctor: c.doctor_name,
      Date: formatDate(c.consultation_date),
      Mode: c.mode,
      Status: c.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function sendMessage() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch consultations first
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const consultations = res.data;
    
    if (consultations.length === 0) {
      console.log('✗ No consultations available');
      return;
    }
    
    console.log('\n--- Your Consultations ---');
    consultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.doctor_name} - ${formatDate(c.consultation_date)} (${c.mode})`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + consultations.length + '): ');
    const consultationIndex = parseInt(choice) - 1;
    
    if (isNaN(consultationIndex) || consultationIndex < 0 || consultationIndex >= consultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const consultationId = consultations[consultationIndex].id;
    const message_text = await prompt('Message: ');

    await axios.post(`${API_BASE}/consultations/${consultationId}/messages`, 
      { message_text }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Message sent');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewMessages() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch consultations first
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const consultations = res.data;
    
    if (consultations.length === 0) {
      console.log('✗ No consultations available');
      return;
    }
    
    console.log('\n--- Your Consultations ---');
    consultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.doctor_name} - ${formatDate(c.consultation_date)} (${c.mode})`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + consultations.length + '): ');
    const consultationIndex = parseInt(choice) - 1;
    
    if (isNaN(consultationIndex) || consultationIndex < 0 || consultationIndex >= consultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const consultationId = consultations[consultationIndex].id;

    const messageRes = await axios.get(`${API_BASE}/consultations/${consultationId}/messages`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Messages ---');
    console.table(messageRes.data.map(m => ({
      Sender: m.sender_name,
      Message: m.message_text,
      Sent: new Date(m.sent_at).toLocaleString()
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function requestMedicine() {
  if (!authToken) return console.log('✗ Login required');
  const medicine_name = await prompt('Medicine name: ');
  const quantity = await prompt('Quantity: ');
  const urgency = await prompt('Urgency (low/medium/high): ');
  const notes = await prompt('Notes (optional): ');

  try {
    const res = await axios.post(`${API_BASE}/medicine-requests`, 
      { medicine_name, quantity, urgency, notes }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Request created. ID:', res.data.requestId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewMedicineRequests() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/medicine-requests`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Medicine Requests ---');
    console.table(res.data.map(m => ({
       ID: m.id,
      Medicine: m.medicine_name,
      Qty: m.quantity,
      Urgency: m.urgency,
      Status: m.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function listEquipment() {
  const location = await prompt('Filter by location (skip for all): ');
  try {
    const res = await axios.get(`${API_BASE}/equipment`, 
      { params: location ? { location } : {}, headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Available Equipment ---');
    console.table(res.data.map(e => ({
      ID: e.id,
      Item: e.item_name,
      Qty: e.quantity,
      Location: e.location
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function createSponsorship() {
  if (!authToken) return console.log('✗ Login required');
  const treatment_type = await prompt('Treatment type: ');
  const goal_amount = await prompt('Goal amount: ');
  const description = await prompt('Description: ');

  try {
    const res = await axios.post(`${API_BASE}/sponsorships`, 
      { treatment_type, goal_amount, description }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Sponsorship created. ID:', res.data.sponsorshipId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewSponsorships() {
  try {
    const res = await axios.get(`${API_BASE}/sponsorships`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Sponsorships ---');
    console.table(res.data.map(s => ({
      ID: s.id,
      Patient: s.patient_name,
      Treatment: s.treatment_type,
      Goal: `$${s.goal_amount}`,
      Donated: `$${s.donated_amount}`,
      Status: s.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function listHealthGuides() {
  const category = await prompt('Filter by category (skip for all): ');
  try {
    const res = await axios.get(`${API_BASE}/health-guides`, 
      { params: category ? { category } : {}, headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Health Guides ---');
    console.table(res.data.map(g => ({
      ID: g.id,
      Title: g.title,
      Category: g.category,
      Language: g.language
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewAlerts() {
  try {
    const res = await axios.get(`${API_BASE}/alerts`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Public Health Alerts ---');
    console.table(res.data.map(a => ({
      ID: a.id,
      Type: a.type,
      Region: a.region,
      Severity: a.severity,
      Message: a.message
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewNGOs() {
  try {
    const res = await axios.get(`${API_BASE}/ngos`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- NGOs ---');
    console.table(res.data.map(n => ({
      ID: n.id,
      Name: n.name,
      Contact: n.contact_info,
      Region: n.region
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== MENTAL HEALTH FUNCTIONS (PATIENT/ALL) ==============
async function scheduleMentalHealthSession() {
  if (!authToken) return console.log('✗ Login required');
  
  // First, fetch and display available counselors (doctors with counselor specialty)
  try {
    const res = await axios.get(`${API_BASE}/doctors`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const counselors = res.data.filter(d => d.specialty && (d.specialty.toLowerCase().includes('counselor') || d.specialty.toLowerCase().includes('mental') || d.specialty.toLowerCase().includes('psychology')));
    
    if (counselors.length === 0) {
      console.log('✗ No counselors available');
      return;
    }
    
    console.log('\n--- Available Counselors ---');
    counselors.forEach((c, i) => {
      console.log(`${i + 1}) ${c.full_name} - ${c.specialty} ($${c.consultation_fee}/session)`);
    });
    
    const choice = await prompt('\nSelect counselor (1-' + counselors.length + '): ');
    const counselorIndex = parseInt(choice) - 1;
    
    if (isNaN(counselorIndex) || counselorIndex < 0 || counselorIndex >= counselors.length) {
      return console.log('✗ Invalid selection');
    }
    
    const counselor_id = counselors[counselorIndex].id;
    const session_date = await prompt('Session date & time (YYYY-MM-DD or YYYY-MM-DD HH:MM): ');
    const mode = await prompt('Mode (video/audio/chat): ');
    const notes = await prompt('Notes (optional): ');

    const bookRes = await axios.post(`${API_BASE}/mental-health/sessions`, 
      { counselor_id, session_date, mode, notes }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Mental health session booked. ID:', bookRes.data.sessionId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewMentalHealthSessions() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/mental-health/sessions`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Your Mental Health Sessions ---');
    console.table(res.data.map(s => ({
      ID: s.id,
      Counselor: s.counselor_name,
      Date: formatDate(s.session_date),
      Mode: s.mode,
      Status: s.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewSupportGroups() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/mental-health/support-groups`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Support Groups ---');
    console.table(res.data.map(g => ({
      ID: g.id,
      Name: g.name,
      Category: g.category,
      Members: g.member_count,
      Anonymous: g.is_anonymous ? 'Yes' : 'No'
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function joinSupportGroup() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch available support groups
    const res = await axios.get(`${API_BASE}/mental-health/support-groups`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const groups = res.data;
    
    if (groups.length === 0) {
      console.log('✗ No support groups available');
      return;
    }
    
    console.log('\n--- Available Support Groups ---');
    groups.forEach((g, i) => {
      console.log(`${i + 1}) ${g.name} (${g.category}) - ${g.member_count} members`);
    });
    
    const choice = await prompt('\nSelect group (1-' + groups.length + '): ');
    const groupIndex = parseInt(choice) - 1;
    
    if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= groups.length) {
      return console.log('✗ Invalid selection');
    }
    
    const groupId = groups[groupIndex].id;
    
    await axios.post(`${API_BASE}/mental-health/support-groups/${groupId}/join`, 
      {}, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Joined support group');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function createSupportGroup() {
  if (!authToken) return console.log('✗ Login required');
  const name = await prompt('Group name: ');
  const description = await prompt('Description: ');
  const category = await prompt('Category: ');
  const isAnonymous = (await prompt('Anonymous (yes/no) [no]: ')).toLowerCase() === 'yes';

  try {
    const res = await axios.post(`${API_BASE}/mental-health/support-groups`, 
      { name, description, category, isAnonymous }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Support group created. ID:', res.data.groupId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function sendGroupMessage() {
  if (!authToken) return console.log('✗ Login required');
  const groupId = await prompt('Group ID: ');
  const message_text = await prompt('Message: ');

  try {
    await axios.post(`${API_BASE}/mental-health/support-groups/${groupId}/messages`, 
      { message_text }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Message sent');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewGroupMessages() {
  if (!authToken) return console.log('✗ Login required');
  const groupId = await prompt('Group ID: ');

  try {
    const res = await axios.get(`${API_BASE}/mental-health/support-groups/${groupId}/messages`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Group Messages ---');
    console.table(res.data.map(m => ({
      ID: m.id,
      Sender: m.sender_name,
      Message: m.message_text,
      Sent: m.sent_at
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== DOCTOR FUNCTIONS ==============
async function createDoctorProfile() {
  if (!authToken) return console.log('✗ Login required');
  const specialty = await prompt('Specialty: ');
  const license_no = await prompt('Medical License #: ');
  const experience_years = await prompt('Years of experience: ');
  const consultation_fee = await prompt('Consultation fee: ');

  try {
    const res = await axios.post(`${API_BASE}/doctors/profile`, 
      { specialty, license_no, experience_years, consultation_fee }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Doctor profile created successfully');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function updateDoctorProfile() {
  if (!authToken) return console.log('✗ Login required');
  const specialty = await prompt('Specialty (skip to keep): ');
  const license_no = await prompt('Medical License # (skip to keep): ');
  const experience_years = await prompt('Years of experience (skip to keep): ');
  const consultation_fee = await prompt('Consultation fee (skip to keep): ');

  const body = {};
  if (specialty) body.specialty = specialty;
  if (license_no) body.license_no = license_no;
  if (experience_years) body.experience_years = experience_years;
  if (consultation_fee) body.consultation_fee = consultation_fee;

  if (Object.keys(body).length === 0) {
    return console.log('No changes provided');
  }

  try {
    await axios.post(`${API_BASE}/doctors/profile`, body, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Profile updated');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewDoctorConsultations() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Your Consultations ---');
    console.table(res.data.map(c => ({
      ID: c.id,
      Patient: c.patient_name,
      Date: formatDate(c.consultation_date),
      Mode: c.mode,
      Status: c.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function acceptConsultation() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch doctor's consultations
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const pendingConsultations = res.data.filter(c => c.status === 'pending');
    
    if (pendingConsultations.length === 0) {
      console.log('✗ No pending consultations');
      return;
    }
    
    console.log('\n--- Pending Consultations ---');
    pendingConsultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.patient_name} - ${c.consultation_date} (${c.mode})`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + pendingConsultations.length + '): ');
    const consultationIndex = parseInt(choice) - 1;
    
    if (isNaN(consultationIndex) || consultationIndex < 0 || consultationIndex >= pendingConsultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const consultationId = pendingConsultations[consultationIndex].id;
    
    await axios.patch(`${API_BASE}/consultations/${consultationId}/status`, 
      { status: 'accepted' }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Consultation accepted');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function createHealthGuide() {
  if (!authToken) return console.log('✗ Login required');
  const title = await prompt('Title: ');
  const content = await prompt('Content: ');
  const category = await prompt('Category: ');
  const language = await prompt('Language [en]: ') || 'en';

  try {
    const res = await axios.post(`${API_BASE}/health-guides`, 
      { title, content, category, language }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Guide created. ID:', res.data.guideId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== DONOR FUNCTIONS ==============
async function viewDonationHistory() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/donations/history`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    if (res.data.donations.length === 0) {
      console.log('\n✗ No donations found');
      return;
    }
    
    console.log('\n--- Your Donation History ---');
    console.table(res.data.donations.map(d => ({
      ID: d.id,
      Sponsorship: `${d.patient_name} - ${d.treatment_type}`,
      Amount: `$${parseFloat(d.amount).toFixed(2)}`,
      Method: d.payment_method,
      Status: d.status,
      Date: new Date(d.created_at).toLocaleDateString()
    })));
    
    console.log(`\n📊 Statistics:`);
    console.log(`  Total Donations: ${res.data.total_donations}`);
    console.log(`  Total Amount Donated: $${parseFloat(res.data.total_amount_donated).toFixed(2)}`);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function donateToSponsorship() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch available sponsorships
    const res = await axios.get(`${API_BASE}/sponsorships`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    // Filter for open sponsorships (not yet fully funded)
    const sponsorships = res.data.filter(s => s.status === 'open' || s.status === 'active');
    
    if (sponsorships.length === 0) {
      console.log('✗ No available sponsorships');
      return;
    }
    
    console.log('\n--- Available Sponsorships to Support ---');
    sponsorships.forEach((s, i) => {
      const goal = parseFloat(s.goal_amount) || 0;
      const donated = parseFloat(s.donated_amount) || 0;
      const remaining = goal - donated;
      console.log(`${i + 1}) ${s.patient_name} - ${s.treatment_type}`);
      console.log(`   Goal: $${goal.toFixed(2)} | Raised: $${donated.toFixed(2)} | Needed: $${remaining.toFixed(2)}`);
    });
    
    const choice = await prompt('\nSelect sponsorship (1-' + sponsorships.length + '): ');
    const sponsorIndex = parseInt(choice) - 1;
    
    if (isNaN(sponsorIndex) || sponsorIndex < 0 || sponsorIndex >= sponsorships.length) {
      return console.log('✗ Invalid selection');
    }
    
    const sponsorship = sponsorships[sponsorIndex];
    const sponsorship_id = sponsorship.id;
    const goal = parseFloat(sponsorship.goal_amount) || 0;
    const donated = parseFloat(sponsorship.donated_amount) || 0;
    const remaining = goal - donated;
    
    console.log(`\n--- Donation Details ---`);
    console.log(`Remaining to fund: $${remaining.toFixed(2)}`);
    
    const amount = await prompt('Amount to donate: $');
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      return console.log('✗ Invalid amount. Must be a positive number.');
    }
    
    if (parseFloat(amount) > remaining) {
      console.log(`⚠ Amount exceeds remaining needed ($${remaining.toFixed(2)}). It will help complete the sponsorship!`);
    }
    
    console.log('\n--- Payment Method ---');
    console.log('1) Card (Credit/Debit Card)');
    console.log('2) Bank Transfer');
    const methodChoice = await prompt('Select payment method (1-2): ');
    
    let payment_method;
    if (methodChoice === '1') {
      payment_method = 'card';
    } else if (methodChoice === '2') {
      payment_method = 'bank';
    } else {
      return console.log('✗ Invalid payment method selection');
    }

    console.log(`\n⏳ Processing donation via ${payment_method}...`);
    
    const donateRes = await axios.post(`${API_BASE}/donations`, 
      { sponsorship_id, amount: parseFloat(amount), payment_method }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('\n✓ Donation successful!');
    console.log(`  Transaction ID: ${donateRes.data.transactionId}`);
    console.log(`  Amount: $${donateRes.data.amount}`);
    console.log(`  Payment Method: ${donateRes.data.payment_method}`);
    console.log(`  Status: ${donateRes.data.status}`);
    console.log(`  Sponsorship Funded: ${donateRes.data.sponsorship_funded_amount}/${donateRes.data.sponsorship_goal}`);
    
    if (donateRes.data.isFunded) {
      console.log('  🎉 This sponsorship is now fully funded!');
    }
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== NGO FUNCTIONS ==============
async function viewNGOMissions() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/ngos/missions`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- NGO Missions ---');
    console.table(res.data.map(m => ({
      ID: m.id,
      Title: m.mission_type,
      Location: m.location,
      Date: m.mission_date,
      DoctorNeeded: m.doctor_needed ? 'Yes' : 'No',
      NGO: m.ngo_name
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function createMission() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    console.log('\n--- Create Mission ---');
    console.log('(NGO = Non-Governmental Organization - your organization)');
    
    // Get all NGOs - try both verified and all
    let ngos = [];
    try {
      const res = await axios.get(`${API_BASE}/ngos`, 
        { headers: authHeaders(), timeout: 5000 }
      );
      ngos = res.data;
    } catch (err) {
      // If public list is empty, ask for NGO ID
      console.log('Note: Could not fetch organization list. Please enter your organization ID below.');
    }
    
    let ngo_id;
    if (ngos.length > 0) {
      console.log('\n--- Select Your Organization ---');
      ngos.forEach((n, i) => {
        console.log(`${i + 1}) ${n.name}`);
      });
      
      const choice = await prompt('Select organization (1-' + ngos.length + '): ');
      const ngoIndex = parseInt(choice) - 1;
      
      if (isNaN(ngoIndex) || ngoIndex < 0 || ngoIndex >= ngos.length) {
        return console.log('✗ Invalid selection');
      }
      
      ngo_id = ngos[ngoIndex].id;
    } else {
      ngo_id = await prompt('Organization ID: ');
    }
    
    // Mission type selection
    console.log('\n--- Mission Type ---');
    console.log('1) Medical - Healthcare/medical services');
    console.log('2) Supply - Medical supplies and equipment');
    console.log('3) Volunteer - Volunteer coordination');
    
    const typeChoice = await prompt('Select mission type (1-3): ');
    const types = { '1': 'medical', '2': 'supply', '3': 'volunteer' };
    const mission_type = types[typeChoice];
    
    if (!mission_type) {
      return console.log('✗ Invalid mission type');
    }
    
    const mission_date = await prompt('Mission date (YYYY-MM-DD): ');
    const location = await prompt('Location: ');
    const doctor_needed = (await prompt('Doctor needed? (1=yes, 2=no) [2]: ') || '2') === '1';
    const description = await prompt('Description: ');

    const res = await axios.post(`${API_BASE}/ngos/missions`, 
      { ngo_id: parseInt(ngo_id), mission_type, mission_date, location, doctor_needed, description }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Mission created successfully. ID:', res.data.missionId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.response?.data?.details || err.message);
  }
}

async function updateMission() {
  if (!authToken) return console.log('✗ Login required');
  
  console.log('✗ Mission update is not yet available on the backend');
  console.log('You can create new missions or contact administration for updates');
}

async function viewEquipmentRequests() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/equipment-requests`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Equipment Requests ---');
    console.table(res.data.map(e => ({
      ID: e.id,
      Item: e.item_name,
      Qty: e.quantity,
      Status: e.status
    })));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== ADMIN FUNCTIONS ==============
async function createAlert() {
  if (!authToken) return console.log('✗ Login required');
  const type = await prompt('Alert type (disease/safety/weather): ');
  const region = await prompt('Region: ');
  const severity = await prompt('Severity (low/medium/high/critical): ');
  const message = await prompt('Message: ');

  try {
    const res = await axios.post(`${API_BASE}/alerts`, 
      { type, region, severity, message }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Alert created. ID:', res.data.alertId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function createNGO() {
  if (!authToken) return console.log('✗ Login required');
  console.log('\n--- Create NGO ---');
  const name = await prompt('NGO name: ');
  const contact_info = await prompt('Contact info: ');

  try {
    const res = await axios.post(`${API_BASE}/ngos`, 
      { name, contact_info }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ NGO created. ID:', res.data.ngoId);
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function manageNGOs() {
  if (!authToken) return console.log('✗ Login required');
  console.log('\n--- Manage NGOs ---');
  const choice = await prompt('1) Create NGO 2) Approve NGO 3) Reject NGO 4) View pending: ');

  if (choice === '1') {
    await createNGO();
  } else if (choice === '2') {
    const ngoId = await prompt('NGO ID to approve: ');
    try {
      await axios.put(`${API_BASE}/ngos/${ngoId}/approve`, 
        {}, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ NGO approved');
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  } else if (choice === '2') {
    const ngoId = await prompt('NGO ID to approve: ');
    try {
      await axios.put(`${API_BASE}/ngos/${ngoId}/approve`, 
        {}, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ NGO approved');
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  } else if (choice === '3') {
    const ngoId = await prompt('NGO ID to reject: ');
    const reason = await prompt('Reason: ');
    try {
      await axios.put(`${API_BASE}/ngos/${ngoId}/reject`, 
        { reason }, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ NGO rejected');
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  }
}

// ============== MAIN MENU ==============
function getMenu() {
  const menus = {
    null: ['1) Login', '2) Register', '0) Exit'],
    patient: [
      '1) View profile',
      '2) Update profile', 
      '3) Change password',
      '4) List doctors',
      '5) Book consultation',
      '6) View consultations',
      '7) Send message',
      '8) View messages',
      '9) Request medicine',
      '10) View medicine requests',
      '11) List equipment',
      '12) Create sponsorship',
      '13) View sponsorships',
      '14) View health guides',
      '15) View alerts',
      '16) View NGOs',
      '17) Schedule mental health session',
      '18) View mental health sessions',
      '19) View support groups',
      '20) Join support group',
      '21) Logout',
      '0) Exit'
    ],
    doctor: [
      '1) View profile',
      '2) Create doctor profile',
      '3) Update doctor profile',
      '4) View consultations',
      '5) Accept consultation',
      '6) Send message',
      '7) View messages',
      '8) Create health guide',
      '9) Create support group',
      '10) View support groups',
      '11) View alerts',
      '12) Logout',
      '0) Exit'
    ],
    donor: [
      '1) View profile',
      '2) Update profile',
      '3) View sponsorships',
      '4) Donate to sponsorship',
      '5) View donation history',
      '6) View alerts',
      '7) View health guides',
      '8) Logout',
      '0) Exit'
    ],
    ngo: [
      '1) View profile',
      '2) View missions',
      '3) Create mission',
      '4) Update mission',
      '5) View equipment requests',
      '6) View alerts',
      '7) Logout',
      '0) Exit'
    ],
    admin: [
      '1) View profile',
      '2) Create alert',
      '3) View alerts',
      '4) Manage NGOs',
      '5) View all sponsorships',
      '6) Create NGO',
      '7) Logout',
      '0) Exit'
    ]
  };
  return menus[currentUser?.role] || menus[null];
}

async function mainMenu() {
  while (true) {
    console.log('\n===== HealthPal CLI =====');
    console.log(`${currentUser ? `Logged in as: ${currentUser.full_name} (${currentUser.role})` : 'Not logged in'}`);
    console.log('------------------------');
    getMenu().forEach(line => console.log(line));

    const choice = await prompt('> ');

    if (!currentUser) {
      switch (choice) {
        case '1': await login(); break;
        case '2': await register(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    } else if (currentUser.role === 'patient') {
      switch (choice) {
        case '1': await viewProfile(); break;
        case '2': await updateProfile(); break;
        case '3': await changePassword(); break;
        case '4': await listDoctors(); break;
        case '5': await bookConsultation(); break;
        case '6': await viewConsultations(); break;
        case '7': await sendMessage(); break;
        case '8': await viewMessages(); break;
        case '9': await requestMedicine(); break;
        case '10': await viewMedicineRequests(); break;
        case '11': await listEquipment(); break;
        case '12': await createSponsorship(); break;
        case '13': await viewSponsorships(); break;
        case '14': await listHealthGuides(); break;
        case '15': await viewAlerts(); break;
        case '16': await viewNGOs(); break;
        case '17': await scheduleMentalHealthSession(); break;
        case '18': await viewMentalHealthSessions(); break;
        case '19': await viewSupportGroups(); break;
        case '20': await joinSupportGroup(); break;
        case '21': await logout(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    } else if (currentUser.role === 'doctor') {
      switch (choice) {
        case '1': await viewProfile(); break;
        case '2': await createDoctorProfile(); break;
        case '3': await updateDoctorProfile(); break;
        case '4': await viewDoctorConsultations(); break;
        case '5': await acceptConsultation(); break;
        case '6': await sendMessage(); break;
        case '7': await viewMessages(); break;
        case '8': await createHealthGuide(); break;
        case '9': await createSupportGroup(); break;
        case '10': await viewSupportGroups(); break;
        case '11': await viewAlerts(); break;
        case '12': await logout(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    } else if (currentUser.role === 'donor') {
      switch (choice) {
        case '1': await viewProfile(); break;
        case '2': await updateProfile(); break;
        case '3': await viewSponsorships(); break;
        case '4': await donateToSponsorship(); break;
        case '5': await viewDonationHistory(); break;
        case '6': await viewAlerts(); break;
        case '7': await listHealthGuides(); break;
        case '8': await logout(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    } else if (currentUser.role === 'ngo') {
      switch (choice) {
        case '1': await viewProfile(); break;
        case '2': await viewNGOMissions(); break;
        case '3': await createMission(); break;
        case '4': await updateMission(); break;
        case '5': await viewEquipmentRequests(); break;
        case '6': await viewAlerts(); break;
        case '7': await logout(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    } else if (currentUser.role === 'admin') {
      switch (choice) {
        case '1': await viewProfile(); break;
        case '2': await createAlert(); break;
        case '3': await viewAlerts(); break;
        case '4': await manageNGOs(); break;
        case '5': await viewSponsorships(); break;
        case '6': await createNGO(); break;
        case '7': await logout(); break;
        case '0': console.log('Goodbye'); rl.close(); return;
        default: console.log('Invalid choice');
      }
    }
  }
}

console.log('HealthPal CLI - Starting...');
mainMenu();
