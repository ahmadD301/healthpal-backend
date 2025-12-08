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

// Helper function to validate and convert date+time formats to YYYY-MM-DD HH:MM:SS
const validateAndFormatDateTime = (dateInput, timeInput) => {
  if (!dateInput || typeof dateInput !== 'string') return null;
  
  let date = null;
  
  // Try common date formats
  // Format 1: YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    date = new Date(dateInput + 'T00:00:00Z');
  }
  // Format 2: DD-MM-YYYY
  else if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('-');
    date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  // Format 3: MM/DD/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
    const [month, day, year] = dateInput.split('/');
    date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  // Format 4: DD/MM/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
    const parts = dateInput.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  }
  
  // Validate the date
  if (!date || isNaN(date.getTime())) return null;
  
  // Parse time if provided (HH:MM or HH:MM:SS format)
  let hours = 0, minutes = 0, seconds = 0;
  if (timeInput && typeof timeInput === 'string') {
    const timeParts = timeInput.split(':');
    if (timeParts.length >= 2 && /^\d{1,2}$/.test(timeParts[0]) && /^\d{1,2}$/.test(timeParts[1])) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = timeParts.length >= 3 ? parseInt(timeParts[2]) : 0;
      
      // Validate time values
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        return null;
      }
    } else {
      return null;
    }
  }
  
  // Return in YYYY-MM-DD HH:MM:SS format
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hr = String(hours).padStart(2, '0');
  const min = String(minutes).padStart(2, '0');
  const sec = String(seconds).padStart(2, '0');
  return `${year}-${month}-${day} ${hr}:${min}:${sec}`;
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
    console.log(`Member Since: ${formatDate(user.created_at)}`);
    
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
      License: d.license_no || 'N/A',
      Experience: `${d.experience_years || 'N/A'} yrs`,
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
    
    // Show consultation mode options
    console.log('\n--- Consultation Mode ---');
    console.log('1) Chat');
    console.log('2) Audio Call');
    console.log('3) Video Call');
    const modeChoice = await prompt('Select mode (1-3): ');
    const modeMap = { '1': 'chat', '2': 'audio', '3': 'video' };
    const mode = modeMap[modeChoice];
    
    if (!mode) {
      return console.log('✗ Invalid mode selection');
    }
    
    const notes = await prompt('Notes (optional): ');

    const bookRes = await axios.post(`${API_BASE}/consultations`, 
      { doctor_id, consultation_date, mode, notes }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Consultation booked. ID:', bookRes.data.consultationId);
    console.log(`  Mode: ${mode.toUpperCase()}`);
    console.log('  Please wait for the doctor to accept your consultation request');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

// ============== PATIENT VIDEO/AUDIO CALL FUNCTIONS ==============

async function patientStartVideoCall(consultationId) {
  try {
    // First, auto-end any existing active calls
    const res = await axios.get(`${API_BASE}/consultations/${consultationId}/video-calls`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    const activeCalls = res.data.filter(c => c.status === 'active');
    
    // End all active calls
    if (activeCalls.length > 0) {
      console.log(`⏹ Ending ${activeCalls.length} active call(s)...`);
      for (const call of activeCalls) {
        try {
          await axios.patch(`${API_BASE}/consultations/${consultationId}/video-calls/end`, 
            { callId: call.id }, 
            { headers: authHeaders(), timeout: 5000 }
          );
        } catch (err) {
          // Continue even if ending previous call fails
        }
      }
    }
    
    // Now start new call
    const newCallRes = await axios.post(`${API_BASE}/consultations/${consultationId}/video-calls`, 
      {}, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Video call started');
    console.log(`  Call ID: ${newCallRes.data.videoCallId || 'N/A'}`);
    console.log('  📹 [Video call interface would open here in a real application]');
  } catch (err) {
    console.error('✗ Error starting video call:', err.response?.data?.error || err.message);
  }
}

async function patientStartAudioCall(consultationId) {
  try {
    // First, auto-end any existing active calls
    const res = await axios.get(`${API_BASE}/consultations/${consultationId}/audio-calls`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    const activeCalls = res.data.filter(c => c.status === 'active');
    
    // End all active calls
    if (activeCalls.length > 0) {
      console.log(`⏹ Ending ${activeCalls.length} active call(s)...`);
      for (const call of activeCalls) {
        try {
          await axios.patch(`${API_BASE}/consultations/${consultationId}/audio-calls/end`, 
            { callId: call.id }, 
            { headers: authHeaders(), timeout: 5000 }
          );
        } catch (err) {
          // Continue even if ending previous call fails
        }
      }
    }
    
    // Now start new call
    const newCallRes = await axios.post(`${API_BASE}/consultations/${consultationId}/audio-calls`, 
      {}, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('✓ Audio call started');
    console.log(`  Call ID: ${newCallRes.data.audioCallId || 'N/A'}`);
    console.log('  🎙 [Audio call interface would open here in a real application]');
  } catch (err) {
    console.error('✗ Error starting audio call:', err.response?.data?.error || err.message);
  }
}

async function viewConsultations() {
  if (!authToken) return console.log('✗ Login required');
  try {
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    console.log('\n--- Your Consultations ---');
    console.table(res.data.map(c => {
      return {
        ID: c.id,
        Doctor: c.doctor_name,
        Date: formatDate(c.consultation_date),
        Mode: c.mode,
        Status: c.status
      };
    }));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function callManagementMenu() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch consultations to show video/audio enabled ones
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    const callConsultations = res.data.filter(c => c.mode === 'video' || c.mode === 'audio');
    
    if (callConsultations.length === 0) {
      console.log('✗ No video/audio consultations');
      return;
    }
    
    console.log('\n--- Video/Audio Consultations ---');
    callConsultations.forEach((c, i) => {
      // Show actual stored status in the list
      console.log(`${i + 1}) ${c.doctor_name} - ${c.mode.toUpperCase()} - ${formatDate(c.consultation_date)} [${c.status}]`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + callConsultations.length + '): ');
    const conIndex = parseInt(choice) - 1;
    
    if (isNaN(conIndex) || conIndex < 0 || conIndex >= callConsultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const consultation = callConsultations[conIndex];
    
    // Check if consultation is accepted or completed (based on actual stored status)
    if (consultation.status !== 'accepted' && consultation.status !== 'completed') {
      console.log(`✗ Cannot manage calls - consultation status is "${consultation.status}"`);
      console.log('  Calls can only be managed for accepted or completed consultations');
      console.log('  Please wait for the doctor to accept this consultation');
      return;
    }
    
    // If completed, don't allow starting new calls
    if (consultation.status === 'completed') {
      console.log('\n--- Call Management (Completed Consultation) ---');
      console.log('1) View call history');
      console.log('0) Back');
      
      const action = await prompt('> ');
      
      if (action === '1') {
        await viewActiveCalls(consultation.id, consultation.mode);
      }
      return;
    }
    
    // If accepted, allow full management
    console.log('\n--- Call Management ---');
    console.log('1) View active calls');
    console.log('2) Start new call');
    console.log('3) End call');
    console.log('0) Back');
    
    const action = await prompt('> ');
    
    if (action === '1') {
      await viewActiveCalls(consultation.id, consultation.mode);
    } else if (action === '2') {
      if (consultation.mode === 'video') {
        await patientStartVideoCall(consultation.id);
      } else {
        await patientStartAudioCall(consultation.id);
      }
    } else if (action === '3') {
      await endCall(consultation.id, consultation.mode);
    }
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function viewActiveCalls(consultationId, mode) {
  try {
    const endpoint = mode === 'video' ? 'video-calls' : 'audio-calls';
    const res = await axios.get(`${API_BASE}/consultations/${consultationId}/${endpoint}`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log(`\n--- ${mode.toUpperCase()} Call History ---`);
    if (res.data.length === 0) {
      console.log('No calls');
      return;
    }
    
    // Get consultation to check if completed
    const consultationRes = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    const consultation = consultationRes.data.find(c => c.id === consultationId);
    const isCompleted = consultation && consultation.status === 'completed';
    
    console.table(res.data.map(c => {
      let duration = 'Ongoing';
      
      // If completed or consultation is completed, mark all as completed
      let displayStatus = c.status;
      if (isCompleted && c.status === 'active') {
        displayStatus = 'completed';
      }
      
      // If completed, calculate or use stored duration
      if (displayStatus === 'completed' || c.status === 'completed') {
        if (c.duration_seconds && c.duration_seconds > 0) {
          const hours = Math.floor(c.duration_seconds / 3600);
          const minutes = Math.floor((c.duration_seconds % 3600) / 60);
          const seconds = c.duration_seconds % 60;
          
          if (hours > 0) {
            duration = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            duration = `${minutes}m ${seconds}s`;
          }
        } else if (c.started_at && c.ended_at) {
          // Calculate from timestamps
          const start = new Date(c.started_at);
          const end = new Date(c.ended_at);
          const diffSeconds = Math.floor((end - start) / 1000);
          
          if (diffSeconds > 0) {
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;
            
            if (hours > 0) {
              duration = `${hours}h ${minutes}m ${seconds}s`;
            } else {
              duration = `${minutes}m ${seconds}s`;
            }
          } else {
            duration = '0m 0s';
          }
        } else {
          duration = '0m 0s';
        }
      }
      
      return {
        ID: c.id,
        Status: displayStatus,
        StartedAt: formatDate(c.started_at),
        Duration: duration
      };
    }));
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function endCall(consultationId, mode) {
  try {
    const endpoint = mode === 'video' ? 'video-calls' : 'audio-calls';
    
    // First get all calls (not just active)
    const res = await axios.get(`${API_BASE}/consultations/${consultationId}/${endpoint}`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    if (res.data.length === 0) {
      console.log('✗ No calls found for this consultation');
      return;
    }
    
    // Display calls and let user select which one to end
    console.log(`\n--- ${mode.toUpperCase()} Calls ---`);
    res.data.forEach((c, i) => {
      console.log(`${i + 1}) ID: ${c.id} | Status: ${c.status} | Started: ${formatDate(c.started_at)}`);
    });
    
    const choice = await prompt(`\nSelect call to end (1-${res.data.length}): `);
    const callIndex = parseInt(choice) - 1;
    
    if (isNaN(callIndex) || callIndex < 0 || callIndex >= res.data.length) {
      return console.log('✗ Invalid selection');
    }
    
    const selectedCall = res.data[callIndex];
    const callId = selectedCall.id;
    
    // Check if call is already completed
    if (selectedCall.status === 'completed') {
      return console.log('✗ Cannot end this call - it is already completed');
    }
    
    await axios.patch(`${API_BASE}/consultations/${consultationId}/${endpoint}/end`, 
      { callId: callId }, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('✓ Call ended successfully');
  } catch (err) {
    console.error('✗ Error ending call:', err.response?.data?.error || err.message);
  }
}

async function sendMessage() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch consultations first
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    // Filter only chat mode consultations
    const consultations = res.data.filter(c => c.mode === 'chat');
    
    if (consultations.length === 0) {
      console.log('✗ No chat consultations available');
      return;
    }
    
    console.log('\n--- Chat Consultations ---');
    consultations.forEach((c, i) => {
      const otherPersonName = currentUser.role === 'doctor' ? c.patient_name : c.doctor_name;
      console.log(`${i + 1}) ${otherPersonName || 'Unknown'} - ${formatDate(c.consultation_date)}`);
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
    // Filter only chat mode consultations
    const consultations = res.data.filter(c => c.mode === 'chat');
    
    if (consultations.length === 0) {
      console.log('✗ No chat consultations available');
      return;
    }
    
    console.log('\n--- Chat Consultations ---');
    consultations.forEach((c, i) => {
      const otherPersonName = currentUser.role === 'doctor' ? c.patient_name : c.doctor_name;
      console.log(`${i + 1}) ${otherPersonName || 'Unknown'} - ${formatDate(c.consultation_date)}`);
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
      Sent: formatDate(m.sent_at)
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

async function viewDiseaseOutbreaks() {
  try {
    console.log('\n--- Fetching COVID-19 Statistics for Palestine ---');
    const res = await axios.get(`${API_BASE}/external/disease-outbreaks`, 
      { timeout: 10000 }
    );
    
    // Format numbers in English (US locale)
    const formatNumber = (num) => num.toLocaleString('en-US');
    
    console.log('\n✓ COVID-19 Statistics (Palestine):');
    console.log(`  Country: ${res.data.country}`);
    console.log(`  Total Cases: ${formatNumber(res.data.cases)}`);
    console.log(`  Cases Today: ${formatNumber(res.data.todayCases)}`);
    console.log(`  Total Deaths: ${formatNumber(res.data.deaths)}`);
    console.log(`  Recovered: ${formatNumber(res.data.recovered)}`);
    console.log(`  Active Cases: ${formatNumber(res.data.active)}`);
    console.log(`  Critical Cases: ${formatNumber(res.data.critical)}`);
    console.log(`  Cases per Million: ${formatNumber(res.data.casesPerMillion)}`);
    console.log(`  Last Updated: ${formatDate(res.data.updated)}`);
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
      Verified: n.verified ? 'Yes' : 'No'
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
      Sent: formatDate(m.sent_at)
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
    console.log('\n--- Your Consultations (Doctor View) ---');
    console.table(res.data.map(c => {
      return {
        ID: c.id,
        Patient: c.patient_name,
        Date: formatDate(c.consultation_date),
        Mode: c.mode,
        Status: c.status
      };
    }));
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
    
    // Filter for actual pending consultations
    const pendingConsultations = res.data.filter(c => c.status === 'pending');
    
    if (pendingConsultations.length === 0) {
      console.log('✗ No pending consultations');
      return;
    }
    
    console.log('\n--- Pending Consultations ---');
    pendingConsultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.patient_name} - ${formatDate(c.consultation_date)} (${c.mode})`);
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

async function startVideoCall() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch doctor's consultations
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    // Filter for video consultations that are pending or accepted
    const videoConsultations = res.data.filter(c => c.mode === 'video' && (c.status === 'pending' || c.status === 'accepted'));
    
    if (videoConsultations.length === 0) {
      console.log('✗ No pending or accepted video consultations available');
      return;
    }
    
    console.log('\n--- Video Consultations (Pending/Accepted) ---');
    videoConsultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.patient_name} - ${formatDate(c.consultation_date)} (${c.status})`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + videoConsultations.length + '): ');
    const consultationIndex = parseInt(choice) - 1;
    
    if (isNaN(consultationIndex) || consultationIndex < 0 || consultationIndex >= videoConsultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const selectedConsultation = videoConsultations[consultationIndex];
    const consultationId = selectedConsultation.id;
    
    // If pending, accept it first
    if (selectedConsultation.status === 'pending') {
      await axios.patch(`${API_BASE}/consultations/${consultationId}/status`, 
        { status: 'accepted' }, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ Consultation accepted');
    }
    
    // Start video call via new API endpoint
    const callRes = await axios.post(`${API_BASE}/consultations/${consultationId}/video-calls`, 
      {}, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('✓ Video call started with', selectedConsultation.patient_name);
    console.log('📹 Call ID:', callRes.data.callId);
    console.log('📹 [Video call interface would open here in a real application]');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.message);
  }
}

async function startAudioCall() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    // Fetch doctor's consultations
    const res = await axios.get(`${API_BASE}/consultations`, 
      { headers: authHeaders(), timeout: 5000 }
    );
    // Filter for audio consultations that are pending or accepted
    const audioConsultations = res.data.filter(c => c.mode === 'audio' && (c.status === 'pending' || c.status === 'accepted'));
    
    if (audioConsultations.length === 0) {
      console.log('✗ No pending or accepted audio consultations available');
      return;
    }
    
    console.log('\n--- Audio Consultations (Pending/Accepted) ---');
    audioConsultations.forEach((c, i) => {
      console.log(`${i + 1}) ${c.patient_name} - ${formatDate(c.consultation_date)} (${c.status})`);
    });
    
    const choice = await prompt('\nSelect consultation (1-' + audioConsultations.length + '): ');
    const consultationIndex = parseInt(choice) - 1;
    
    if (isNaN(consultationIndex) || consultationIndex < 0 || consultationIndex >= audioConsultations.length) {
      return console.log('✗ Invalid selection');
    }
    
    const selectedConsultation = audioConsultations[consultationIndex];
    const consultationId = selectedConsultation.id;
    
    // If pending, accept it first
    if (selectedConsultation.status === 'pending') {
      await axios.patch(`${API_BASE}/consultations/${consultationId}/status`, 
        { status: 'accepted' }, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ Consultation accepted');
    }
    
    // Start audio call via new API endpoint
    const callRes = await axios.post(`${API_BASE}/consultations/${consultationId}/audio-calls`, 
      {}, 
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('✓ Audio call started with', selectedConsultation.patient_name);
    console.log('📞 Call ID:', callRes.data.callId);
    console.log('📞 [Audio call interface would open here in a real application]');
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
    
    if (!res.data.donations || res.data.donations.length === 0) {
      console.log('\n✗ No donations found');
      return;
    }
    
    console.log('\n--- Your Donation History ---');
    console.table(res.data.donations.map(d => ({
      ID: d.id,
      Sponsorship: `${d.patient_name} - ${d.treatment_type}`,
      Amount: `$${parseFloat(d.amount).toFixed(2)}`,
      Method: d.payment_method,
      Status: d.sponsorship_status || 'active',
      Date: formatDate(d.created_at)
    })));
    
    console.log(`\n📊 Statistics:`);
    console.log(`  Total Donations: ${res.data.total_donations}`);
    console.log(`  Total Amount Donated: $${parseFloat(res.data.total_amount_donated).toFixed(2)}`);
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
    if (err.response?.status === 401) {
      console.error('  Hint: Authentication failed. Try logging in again.');
    }
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
      Date: m.mission_date ? formatDate(m.mission_date) : '(No date set)',
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
    
    let mission_date;
    while (!mission_date) {
      const dateInput = await prompt('Mission date (YYYY-MM-DD or DD-MM-YYYY): ');
      const timeInput = await prompt('Mission time (HH:MM or HH:MM:SS) [00:00:00]: ') || '00:00:00';
      mission_date = validateAndFormatDateTime(dateInput, timeInput);
      if (!mission_date) {
        console.log('⚠ Invalid date/time format. Use date: YYYY-MM-DD or DD-MM-YYYY, time: HH:MM or HH:MM:SS');
      }
    }
    
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
  
  try {
    console.log('\n--- Update Mission ---');
    
    // First, try to fetch user's missions, fall back to all missions if that fails
    let missions = [];
    let res;
    
    try {
      res = await axios.get(`${API_BASE}/ngos/missions/my`, 
        { headers: authHeaders(), timeout: 5000 }
      );
      missions = res.data;
    } catch (myMissionsErr) {
      try {
        res = await axios.get(`${API_BASE}/ngos/missions`, 
          { headers: authHeaders(), timeout: 5000 }
        );
        missions = res.data;
      } catch (allMissionsErr) {
        console.error('✗ Failed to fetch missions from both endpoints');
        console.error('  Error 1:', myMissionsErr.response?.data?.error || myMissionsErr.message);
        console.error('  Error 2:', allMissionsErr.response?.data?.error || allMissionsErr.message);
        return;
      }
    }

    if (!missions || missions.length === 0) {
      console.log('✗ No missions found');
      return;
    }

    console.log('\n--- Select Mission to Update ---');
    missions.forEach((m, i) => {
      console.log(`${i + 1}) ${m.mission_type} - ${m.location} (${formatDate(m.mission_date)})`);
    });

    const choice = await prompt('Select mission (1-' + missions.length + '): ');
    const missionIndex = parseInt(choice) - 1;

    if (isNaN(missionIndex) || missionIndex < 0 || missionIndex >= missions.length) {
      return console.log('✗ Invalid selection');
    }

    const mission = missions[missionIndex];

    console.log('\n--- Update Fields (press Enter to skip) ---');
    
    // Mission Type
    console.log('1) Medical - Healthcare/medical services');
    console.log('2) Supply - Medical supplies and equipment');
    console.log('3) Volunteer - Volunteer coordination');
    const typeChoice = await prompt('Mission type (press Enter to keep current): ');
    const types = { '1': 'medical', '2': 'supply', '3': 'volunteer' };
    const mission_type = typeChoice ? types[typeChoice] : mission.mission_type;

    // Get current date display
    const currentDateDisplay = mission.mission_date ? formatDate(mission.mission_date) : '(No date/time set)';
    const dateInput = await prompt(`Mission date [${currentDateDisplay}]: `);
    let mission_date;
    
    if (dateInput) {
      // If user provided a new date, ask for time too
      const timeInput = await prompt('Mission time (HH:MM or HH:MM:SS) [00:00:00]: ') || '00:00:00';
      mission_date = validateAndFormatDateTime(dateInput, timeInput);
      if (!mission_date) {
        console.log('✗ Invalid date/time format. Use date: YYYY-MM-DD or DD-MM-YYYY, time: HH:MM or HH:MM:SS');
        return;
      }
    } else {
      // If empty, use existing date, and if that's empty, set to today at 00:00:00
      if (mission.mission_date) {
        mission_date = mission.mission_date;
      } else {
        mission_date = new Date().toISOString().split('T')[0] + ' 00:00:00';
      }
    }

    const location = await prompt(`Location [${mission.location}]: `) || mission.location;
    const description = await prompt(`Description [${mission.description || 'none'}]: `) || mission.description;
    const doctor_needed = (await prompt(`Doctor needed? (1=yes, 2=no) [${mission.doctor_needed ? '1' : '2'}]: `) || (mission.doctor_needed ? '1' : '2')) === '1';

    console.log('\nSubmitting update...');
    console.log('  Mission ID:', mission.id);
    console.log('  Type:', mission_type);
    console.log('  Date:', mission_date);
    console.log('  Location:', location);
    console.log('  Doctor Needed:', doctor_needed);
    console.log('  Description:', description);

    const updateRes = await axios.patch(`${API_BASE}/ngos/missions/${mission.id}`, 
      { mission_type, mission_date, location, doctor_needed, description }, 
      { headers: authHeaders(), timeout: 5000 }
    );

    console.log('✓ Mission updated successfully');
  } catch (err) {
    console.error('✗ Error:', err.response?.data?.error || err.response?.data?.details || err.message);
    if (err.response?.status) {
      console.error('  Status:', err.response.status);
    }
    if (err.response?.data?.details) {
      console.error('  Details:', err.response.data.details);
    }
  }
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

async function createEquipmentRequest() {
  if (!authToken) return console.log('✗ Login required');
  try {
    console.log('\n--- Create Equipment Request ---');
    const item_name = await prompt('Item name: ');
    const quantity = await prompt('Quantity: ');
    const purpose = await prompt('Purpose (optional): ');

    const res = await axios.post(`${API_BASE}/equipment-requests`, 
      { item_name, quantity: parseInt(quantity), purpose: purpose || null },
      { headers: authHeaders(), timeout: 5000 }
    );

    console.log('✓ Equipment request created successfully. ID:', res.data.requestId);
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
  console.log('Note: Review pending NGOs first (option 4), then approve or reject them');
  const choice = await prompt('1) Create NGO 2) Approve NGO 3) Delete/Reject NGO 4) View pending: ');

  if (choice === '1') {
    await createNGO();
  } else if (choice === '2') {
    const ngoId = await prompt('NGO ID to approve: ');
    try {
      await axios.patch(`${API_BASE}/ngos/approve`, 
        { ngo_id: parseInt(ngoId) }, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ NGO approved and verified');
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  } else if (choice === '3') {
    const ngoId = await prompt('NGO ID to delete/reject: ');
    const reason = await prompt('Reason (optional): ');
    try {
      await axios.patch(`${API_BASE}/ngos/reject`, 
        { ngo_id: parseInt(ngoId), reason }, 
        { headers: authHeaders(), timeout: 5000 }
      );
      console.log('✓ NGO rejected and deleted');
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  } else if (choice === '4') {
    try {
      const res = await axios.get(`${API_BASE}/ngos/pending`, 
        { headers: authHeaders(), timeout: 5000 }
      );
      if (res.data.length === 0) {
        console.log('✗ No pending NGOs');
        return;
      }
      console.log('\n--- Pending NGOs (awaiting approval) ---');
      console.table(res.data.map(ngo => ({
        ID: ngo.id,
        Name: ngo.name || '(not provided)',
        Contact: ngo.contact_info || '(not provided)',
        Created: formatDate(ngo.created_at)
      })));
    } catch (err) {
      console.error('✗ Error:', err.response?.data?.error || err.message);
    }
  }
}

// ============== SUBMENU FUNCTIONS ==============

// Patient Submenus
async function patientProfileMenu() {
  while (true) {
    console.log('\n--- PROFILE ---');
    console.log('1) View profile');
    console.log('2) Update profile');
    console.log('3) Change password');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewProfile();
    else if (choice === '2') await updateProfile();
    else if (choice === '3') await changePassword();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientConsultationMenu() {
  while (true) {
    console.log('\n--- CONSULTATIONS ---');
    console.log('1) List doctors');
    console.log('2) Book consultation');
    console.log('3) View consultations');
    console.log('4) Manage calls (video/audio)');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await listDoctors();
    else if (choice === '2') await bookConsultation();
    else if (choice === '3') await viewConsultations();
    else if (choice === '4') await callManagementMenu();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientMessagingMenu() {
  while (true) {
    console.log('\n--- MESSAGING ---');
    console.log('1) Send message');
    console.log('2) View messages');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await sendMessage();
    else if (choice === '2') await viewMessages();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientHealthMenu() {
  while (true) {
    console.log('\n--- HEALTH & MEDICINE ---');
    console.log('1) Request medicine');
    console.log('2) View medicine requests');
    console.log('3) List equipment');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await requestMedicine();
    else if (choice === '2') await viewMedicineRequests();
    else if (choice === '3') await listEquipment();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientSponsorshipMenu() {
  while (true) {
    console.log('\n--- SPONSORSHIPS ---');
    console.log('1) Create sponsorship');
    console.log('2) View sponsorships');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await createSponsorship();
    else if (choice === '2') await viewSponsorships();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientMentalHealthMenu() {
  while (true) {
    console.log('\n--- MENTAL HEALTH ---');
    console.log('1) Schedule mental health session');
    console.log('2) View mental health sessions');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await scheduleMentalHealthSession();
    else if (choice === '2') await viewMentalHealthSessions();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function patientSupportMenu() {
  while (true) {
    console.log('\n--- SUPPORT & RESOURCES ---');
    console.log('1) View support groups');
    console.log('2) Join support group');
    console.log('3) View health guides');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewSupportGroups();
    else if (choice === '2') await joinSupportGroup();
    else if (choice === '3') await listHealthGuides();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

// Doctor Submenus
async function doctorProfileMenu() {
  while (true) {
    console.log('\n--- PROFILE ---');
    console.log('1) View profile');
    console.log('2) Create doctor profile');
    console.log('3) Update doctor profile');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewProfile();
    else if (choice === '2') await createDoctorProfile();
    else if (choice === '3') await updateDoctorProfile();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function doctorConsultationMenu() {
  while (true) {
    console.log('\n--- CONSULTATIONS ---');
    console.log('1) View consultations');
    console.log('2) Accept consultation');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewDoctorConsultations();
    else if (choice === '2') await acceptConsultation();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function doctorCallMenu() {
  while (true) {
    console.log('\n--- CALLS ---');
    console.log('1) Start video call');
    console.log('2) Start audio call');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await startVideoCall();
    else if (choice === '2') await startAudioCall();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function doctorMessagingMenu() {
  while (true) {
    console.log('\n--- MESSAGING ---');
    console.log('1) Send message');
    console.log('2) View messages');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await sendMessage();
    else if (choice === '2') await viewMessages();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function doctorContentMenu() {
  while (true) {
    console.log('\n--- CONTENT & SUPPORT ---');
    console.log('1) Create health guide');
    console.log('2) Create support group');
    console.log('3) View support groups');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await createHealthGuide();
    else if (choice === '2') await createSupportGroup();
    else if (choice === '3') await viewSupportGroups();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

// Donor Submenus
async function donorProfileMenu() {
  while (true) {
    console.log('\n--- PROFILE ---');
    console.log('1) View profile');
    console.log('2) Update profile');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewProfile();
    else if (choice === '2') await updateProfile();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function donorSponsorshipMenu() {
  while (true) {
    console.log('\n--- SPONSORSHIPS ---');
    console.log('1) View sponsorships');
    console.log('2) Donate to sponsorship');
    console.log('3) View donation history');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewSponsorships();
    else if (choice === '2') await donateToSponsorship();
    else if (choice === '3') await viewDonationHistory();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

// NGO Submenus
async function ngoProfileMenu() {
  while (true) {
    console.log('\n--- PROFILE ---');
    console.log('1) View profile');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewProfile();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function ngoMissionMenu() {
  while (true) {
    console.log('\n--- MISSIONS ---');
    console.log('1) View missions');
    console.log('2) Create mission');
    console.log('3) Update mission');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewNGOMissions();
    else if (choice === '2') await createMission();
    else if (choice === '3') await updateMission();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function ngoEquipmentMenu() {
  while (true) {
    console.log('\n--- EQUIPMENT ---');
    console.log('1) View equipment requests');
    console.log('2) Create equipment request');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewEquipmentRequests();
    else if (choice === '2') await createEquipmentRequest();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

// Admin Submenus
async function adminProfileMenu() {
  while (true) {
    console.log('\n--- PROFILE ---');
    console.log('1) View profile');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await viewProfile();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function adminAlertMenu() {
  while (true) {
    console.log('\n--- ALERTS ---');
    console.log('1) Create alert');
    console.log('2) View alerts');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await createAlert();
    else if (choice === '2') await viewAlerts();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function adminNGOMenu() {
  while (true) {
    console.log('\n--- NGO MANAGEMENT ---');
    console.log('1) Manage NGOs');
    console.log('2) Create NGO');
    console.log('0) Back to main menu');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await manageNGOs();
    else if (choice === '2') await createNGO();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

// ============== MAIN MENU ==============
function getMenu() {
  const menus = {
    null: ['1) Login', '2) Register', '0) Exit'],
    patient: [
      '--- PROFILE ---',
      '1) View profile',
      '2) Update profile', 
      '3) Change password',
      '--- CONSULTATIONS ---',
      '4) List doctors',
      '5) Book consultation',
      '6) View consultations',
      '--- MESSAGING ---',
      '7) Send message',
      '8) View messages',
      '--- HEALTH & MEDICINE ---',
      '9) Request medicine',
      '10) View medicine requests',
      '11) List equipment',
      '--- SPONSORSHIPS ---',
      '12) Create sponsorship',
      '13) View sponsorships',
      '--- MENTAL HEALTH ---',
      '14) Schedule mental health session',
      '15) View mental health sessions',
      '--- SUPPORT & RESOURCES ---',
      '16) View support groups',
      '17) Join support group',
      '18) View health guides',
      '--- OTHER ---',
      '19) View alerts',
      '20) View NGOs',
      '21) Logout',
      '0) Exit'
    ],
    doctor: [
      '--- PROFILE ---',
      '1) View profile',
      '2) Create doctor profile',
      '3) Update doctor profile',
      '--- CONSULTATIONS ---',
      '4) View consultations',
      '5) Accept consultation',
      '--- CALLS ---',
      '6) Start video call',
      '7) Start audio call',
      '--- MESSAGING ---',
      '8) Send message',
      '9) View messages',
      '--- CONTENT & SUPPORT ---',
      '10) Create health guide',
      '11) Create support group',
      '12) View support groups',
      '--- OTHER ---',
      '13) View alerts',
      '14) Logout',
      '0) Exit'
    ],
    donor: [
      '--- PROFILE ---',
      '1) View profile',
      '2) Update profile',
      '--- SPONSORSHIPS ---',
      '3) View sponsorships',
      '4) Donate to sponsorship',
      '5) View donation history',
      '--- RESOURCES ---',
      '6) View health guides',
      '--- OTHER ---',
      '7) View alerts',
      '8) Logout',
      '0) Exit'
    ],
    ngo: [
      '--- PROFILE ---',
      '1) View profile',
      '--- MISSIONS ---',
      '2) View missions',
      '3) Create mission',
      '4) Update mission',
      '--- EQUIPMENT ---',
      '5) View equipment requests',
      '6) Create equipment request',
      '--- OTHER ---',
      '7) View alerts',
      '8) Logout',
      '0) Exit'
    ],
    admin: [
      '--- PROFILE ---',
      '1) View profile',
      '--- ALERTS ---',
      '2) Create alert',
      '3) View alerts',
      '--- NGO MANAGEMENT ---',
      '4) Manage NGOs',
      '5) Create NGO',
      '--- SPONSORSHIPS ---',
      '6) View all sponsorships',
      '--- OTHER ---',
      '7) Logout',
      '0) Exit'
    ]
  };
  return menus[currentUser?.role] || menus[null];
}

// ============== TRANSLATION FUNCTIONS ==============

async function translateText() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    console.log('\n--- Text Translation ---');
    const text = await prompt('Enter text to translate: ');
    const targetLanguage = await prompt('Target language (ar=Arabic, en=English) [ar]: ') || 'ar';
    
    const res = await axios.post(`${API_BASE}/translate/text`, 
      { text, target_language: targetLanguage },
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('\n✓ Translation Result:');
    console.log(`  Original: ${res.data.original}`);
    console.log(`  Translated: ${res.data.translated}`);
    console.log(`  Target Language: ${res.data.target_language}`);
    console.log(`  Source: ${res.data.source}`);
  } catch (err) {
    console.error('✗ Translation failed:', err.response?.data?.error || err.message);
  }
}

async function detectLanguage() {
  if (!authToken) return console.log('✗ Login required');
  
  try {
    console.log('\n--- Detect Language ---');
    const text = await prompt('Enter text to analyze: ');
    
    const res = await axios.post(`${API_BASE}/translate/detect-language`,
      { text },
      { headers: authHeaders(), timeout: 5000 }
    );
    
    console.log('\n✓ Detected Language: ' + res.data.detected_language);
  } catch (err) {
    console.error('✗ Detection failed:', err.response?.data?.error || err.message);
  }
}

async function translationMenu() {
  while (true) {
    console.log('\n--- TRANSLATION SERVICES ---');
    console.log('1) Translate text');
    console.log('2) Detect language');
    console.log('0) Back');
    
    const choice = await prompt('> ');
    
    if (choice === '1') await translateText();
    else if (choice === '2') await detectLanguage();
    else if (choice === '0') break;
    else console.log('Invalid choice');
  }
}

async function mainMenu() {
  while (true) {
    console.log('\n===== HealthPal CLI =====');
    console.log(`${currentUser ? `Logged in as: ${currentUser.full_name} (${currentUser.role})` : 'Not logged in'}`);
    console.log('------------------------');
    
    if (!currentUser) {
      console.log('1) Login');
      console.log('2) Register');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await login();
      else if (choice === '2') await register();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    } else if (currentUser.role === 'patient') {
      console.log('1) Profile');
      console.log('2) Consultations');
      console.log('3) Messaging');
      console.log('4) Health & Medicine');
      console.log('5) Sponsorships');
      console.log('6) Mental Health');
      console.log('7) Support & Resources');
      console.log('8) Translation Services');
      console.log('9) Disease Outbreaks');
      console.log('10) Alerts');
      console.log('11) View NGOs');
      console.log('12) Logout');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await patientProfileMenu();
      else if (choice === '2') await patientConsultationMenu();
      else if (choice === '3') await patientMessagingMenu();
      else if (choice === '4') await patientHealthMenu();
      else if (choice === '5') await patientSponsorshipMenu();
      else if (choice === '6') await patientMentalHealthMenu();
      else if (choice === '7') await patientSupportMenu();
      else if (choice === '8') await translationMenu();
      else if (choice === '9') await viewDiseaseOutbreaks();
      else if (choice === '10') await viewAlerts();
      else if (choice === '11') await viewNGOs();
      else if (choice === '12') await logout();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    } else if (currentUser.role === 'doctor') {
      console.log('1) Profile');
      console.log('2) Consultations');
      console.log('3) Calls');
      console.log('4) Messaging');
      console.log('5) Content & Support');
      console.log('6) Alerts');
      console.log('7) Logout');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await doctorProfileMenu();
      else if (choice === '2') await doctorConsultationMenu();
      else if (choice === '3') await doctorCallMenu();
      else if (choice === '4') await doctorMessagingMenu();
      else if (choice === '5') await doctorContentMenu();
      else if (choice === '6') await viewAlerts();
      else if (choice === '7') await logout();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    } else if (currentUser.role === 'donor') {
      console.log('1) Profile');
      console.log('2) Sponsorships');
      console.log('3) Health Guides');
      console.log('4) Alerts');
      console.log('5) Logout');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await donorProfileMenu();
      else if (choice === '2') await donorSponsorshipMenu();
      else if (choice === '3') await listHealthGuides();
      else if (choice === '4') await viewAlerts();
      else if (choice === '5') await logout();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    } else if (currentUser.role === 'ngo') {
      console.log('1) Profile');
      console.log('2) Missions');
      console.log('3) Equipment');
      console.log('4) Alerts');
      console.log('5) Logout');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await ngoProfileMenu();
      else if (choice === '2') await ngoMissionMenu();
      else if (choice === '3') await ngoEquipmentMenu();
      else if (choice === '4') await viewAlerts();
      else if (choice === '5') await logout();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    } else if (currentUser.role === 'admin') {
      console.log('1) Profile');
      console.log('2) Alerts');
      console.log('3) NGO Management');
      console.log('4) Sponsorships');
      console.log('5) Logout');
      console.log('0) Exit');
      
      const choice = await prompt('> ');
      
      if (choice === '1') await adminProfileMenu();
      else if (choice === '2') await adminAlertMenu();
      else if (choice === '3') await adminNGOMenu();
      else if (choice === '4') await viewSponsorships();
      else if (choice === '5') await logout();
      else if (choice === '0') {
        console.log('Goodbye');
        rl.close();
        return;
      } else console.log('Invalid choice');
    }
  }
}

console.log('HealthPal CLI - Starting...');
mainMenu();
