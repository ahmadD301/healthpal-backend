// Optional dependencies for notifications
let twilio = null;
let nodemailer = null;

try {
  twilio = require('twilio');
} catch (error) {
  console.warn('⚠️  Twilio not available. SMS notifications will be disabled.');
}

try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.warn('⚠️  Nodemailer not available. Email notifications will be disabled.');
}

// Lazy initialize Twilio (only when needed)
let twilioClient = null;
const getTwilioClient = () => {
  if (!twilio) {
    console.warn('⚠️  Twilio not available. SMS notifications disabled.');
    return null;
  }

  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      console.warn('⚠️  Twilio credentials not configured. SMS notifications will be disabled.');
      return null;
    }
    
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
};

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

// Initialize Nodemailer (optional)
let mailTransporter = null;
const getMailTransporter = () => {
  if (!nodemailer) {
    return null;
  }

  if (!mailTransporter && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    mailTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return mailTransporter;
};

// ==================== SMS NOTIFICATIONS ====================

/**
 * Send SMS notification
 */
exports.sendSMS = async (phoneNumber, message) => {
  const client = getTwilioClient();
  
  if (!client) {
    console.warn(`⚠️  SMS not sent to ${phoneNumber}: Twilio not configured`);
    return {
      success: false,
      error: 'Twilio not configured'
    };
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to: phoneNumber
    });

    console.log(`✅ SMS sent to ${phoneNumber}: ${result.sid}`);
    return {
      success: true,
      messageId: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error(`❌ SMS send failed to ${phoneNumber}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};


/**
 * Send consultation booking SMS
 */
exports.sendConsultationBookingSMS = async (phoneNumber, doctorName, consultationDate) => {
  const message = `HealthPal: Your consultation with Dr. ${doctorName} is scheduled for ${consultationDate}. Reply HELP for more info.`;
  return this.sendSMS(phoneNumber, message);
};

/**
 * Send consultation reminder SMS
 */
exports.sendConsultationReminderSMS = async (phoneNumber, doctorName, consultationDate) => {
  const message = `HealthPal Reminder: Your consultation with Dr. ${doctorName} is tomorrow at ${consultationDate}. Be ready!`;
  return this.sendSMS(phoneNumber, message);
};

/**
 * Send donation confirmation SMS
 */
exports.sendDonationConfirmationSMS = async (phoneNumber, amount, patientName) => {
  const message = `HealthPal: Your donation of $${amount} to help ${patientName} has been confirmed. Thank you for your generosity!`;
  return this.sendSMS(phoneNumber, message);
};

/**
 * Send sponsorship update SMS
 */
exports.sendSponsorshipUpdateSMS = async (phoneNumber, percentage, treatmentType) => {
  const message = `HealthPal: Your ${treatmentType} sponsorship is now ${percentage}% funded. We're getting closer to the goal!`;
  return this.sendSMS(phoneNumber, message);
};

/**
 * Send medicine request update SMS
 */
exports.sendMedicineRequestUpdateSMS = async (phoneNumber, medicineName, status) => {
  const message = `HealthPal: Your request for ${medicineName} is now ${status}. We'll keep you updated!`;
  return this.sendSMS(phoneNumber, message);
};

// ==================== EMAIL NOTIFICATIONS ====================

/**
 * Send email
 */
exports.sendEmail = async (to, subject, htmlContent) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.warn(`⚠️  Email not sent to ${to}: Email service not configured`);
    return {
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@healthpal.io',
      to,
      subject,
      html: htmlContent
    });

    console.log(`✅ Email sent to ${to}: ${result.messageId}`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send welcome email
 */
exports.sendWelcomeEmail = async (email, fullName) => {
  const htmlContent = `
    <h2>Welcome to HealthPal, ${fullName}!</h2>
    <p>We're thrilled to have you join our healthcare platform.</p>
    <p>HealthPal connects you with doctors, medical resources, and a caring community.</p>
    <p>Get started by:</p>
    <ul>
      <li>Completing your profile</li>
      <li>Browsing available doctors</li>
      <li>Booking your first consultation</li>
    </ul>
    <p>Questions? Contact us at support@healthpal.io</p>
  `;

  return this.sendEmail(email, 'Welcome to HealthPal!', htmlContent);
};

/**
 * Send consultation booking confirmation email
 */
exports.sendConsultationBookingEmail = async (email, fullName, doctorName, consultationDate, consultationId) => {
  const htmlContent = `
    <h2>Consultation Booked!</h2>
    <p>Hi ${fullName},</p>
    <p>Your consultation has been successfully booked with <strong>Dr. ${doctorName}</strong>.</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
      <p><strong>Date & Time:</strong> ${consultationDate}</p>
      <p><strong>Consultation ID:</strong> ${consultationId}</p>
    </div>
    <p>You'll receive a reminder 24 hours before your appointment.</p>
    <p>If you need to reschedule, please contact us as soon as possible.</p>
    <p>Best regards,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Consultation Confirmed', htmlContent);
};

/**
 * Send consultation reminder email
 */
exports.sendConsultationReminderEmail = async (email, fullName, doctorName, consultationDate, consultationLink) => {
  const htmlContent = `
    <h2>Reminder: Your Consultation is Tomorrow!</h2>
    <p>Hi ${fullName},</p>
    <p>Don't forget! Your consultation with <strong>Dr. ${doctorName}</strong> is scheduled for:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
      <p><strong>${consultationDate}</strong></p>
    </div>
    <p><a href="${consultationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Consultation</a></p>
    <p>Please log in 5 minutes early.</p>
    <p>Best regards,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Your Consultation Reminder', htmlContent);
};

/**
 * Send donation confirmation email
 */
exports.sendDonationConfirmationEmail = async (email, donorName, amount, patientName, receiptUrl) => {
  const htmlContent = `
    <h2>Thank You for Your Donation!</h2>
    <p>Hi ${donorName},</p>
    <p>We received your generous donation of <strong>$${amount}</strong> to help <strong>${patientName}</strong> with their medical treatment.</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
      <p><strong>Donation Amount:</strong> $${amount}</p>
      <p><strong>Donation Status:</strong> Completed</p>
      ${receiptUrl ? `<p><a href="${receiptUrl}">View Receipt</a></p>` : ''}
    </div>
    <p>Your contribution makes a real difference. Together, we can provide better healthcare access for Palestinian communities.</p>
    <p>Best regards,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Donation Confirmed - Thank You!', htmlContent);
};

/**
 * Send sponsorship fully funded email
 */
exports.sendSponsorshipFundedEmail = async (email, patientName, treatmentType, totalRaised) => {
  const htmlContent = `
    <h2>Great News! Your Sponsorship is Fully Funded! 🎉</h2>
    <p>Hi ${patientName},</p>
    <p>Wonderful news! Your <strong>${treatmentType}</strong> sponsorship has reached its goal!</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px;">
      <p><strong>Total Raised:</strong> $${totalRaised}</p>
      <p><strong>Status:</strong> Fully Funded</p>
    </div>
    <p>The HealthPal team will now work with you to process your treatment.</p>
    <p>Please check your dashboard for next steps.</p>
    <p>With gratitude,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Your Sponsorship is Fully Funded!', htmlContent);
};

/**
 * Send medicine request fulfillment email
 */
exports.sendMedicineRequestEmail = async (email, patientName, medicineName, quantity) => {
  const htmlContent = `
    <h2>Medicine Request Received</h2>
    <p>Hi ${patientName},</p>
    <p>We've received your request for <strong>${medicineName}</strong> (Qty: ${quantity}).</p>
    <p>Our volunteers and partner pharmacies are working to fulfill your request. We'll notify you as soon as we have an update.</p>
    <p>Thank you for your patience.</p>
    <p>Best regards,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Medicine Request Received', htmlContent);
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  const htmlContent = `
    <h2>Password Reset Request</h2>
    <p>You requested to reset your HealthPal password.</p>
    <p><a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>HealthPal Team</p>
  `;

  return this.sendEmail(email, 'Password Reset Request', htmlContent);
};

/**
 * Send alert to user
 */
exports.sendAlertEmail = async (email, fullName, alertType, alertMessage) => {
  const htmlContent = `
    <h2>HealthPal Alert: ${alertType}</h2>
    <p>Hi ${fullName},</p>
    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 5px solid #ffc107;">
      <p><strong>${alertType}</strong></p>
      <p>${alertMessage}</p>
    </div>
    <p>Stay informed and stay safe.</p>
    <p>HealthPal Team</p>
  `;

  return this.sendEmail(email, `Alert: ${alertType}`, htmlContent);
};

// ==================== BATCH NOTIFICATIONS ====================

/**
 * Send bulk email
 */
exports.sendBulkEmail = async (recipients, subject, htmlContent) => {
  const results = [];

  for (const recipient of recipients) {
    const result = await this.sendEmail(recipient.email, subject, htmlContent);
    results.push({
      email: recipient.email,
      success: result.success
    });
  }

  return results;
};

/**
 * Send bulk SMS
 */
exports.sendBulkSMS = async (recipients, message) => {
  const results = [];

  for (const recipient of recipients) {
    const result = await this.sendSMS(recipient.phone, message);
    results.push({
      phone: recipient.phone,
      success: result.success
    });
  }

  return results;
};

// ==================== VERIFICATION ====================

/**
 * Test email configuration
 */
exports.testEmailConfig = async () => {
  try {
    await mailTransporter.verify();
    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration verified' };
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Test SMS configuration
 */
exports.testSMSConfig = async () => {
  const client = getTwilioClient();
  
  if (!client) {
    return { 
      success: false, 
      error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env' 
    };
  }
  
  try {
    // Test Twilio by getting account info
    const account = await client.api.accounts.list({ limit: 1 });
    console.log('✅ Twilio configuration is valid');
    return { success: true, message: 'Twilio configuration verified' };
  } catch (error) {
    console.error('❌ Twilio configuration error:', error.message);
    return { success: false, error: error.message };
  }
};

