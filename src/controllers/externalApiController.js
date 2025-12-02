const externalApis = require('../utils/externalApis');
const paymentUtils = require('../utils/paymentUtils');
const notificationUtils = require('../utils/notificationUtils');
const crypto = require('crypto');

// Get disease outbreaks
exports.getDiseaseOutbreaks = async (req, res) => {
  try {
    const data = await externalApis.getDiseaseOutbreaks('palestine');
    if (!data) {
      return res.status(503).json({ error: 'Disease data service unavailable' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch disease data', details: err.message });
  }
};

// Get medicine information
exports.getMedicineInfo = async (req, res) => {
  try {
    const medicineInfo = await externalApis.getMedicineInfo(req.params.name);
    if (!medicineInfo) {
      return res.status(404).json({ error: 'Medicine not found in database' });
    }
    res.json(medicineInfo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicine info', details: err.message });
  }
};

// Get WHO health data
exports.getWHOHealthData = async (req, res) => {
  try {
    const { indicator = 'WHOSIS_000001' } = req.query;
    const data = await externalApis.getWHOHealthData(indicator);
    if (!data) {
      return res.status(503).json({ error: 'WHO data unavailable' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch WHO data', details: err.message });
  }
};

// ==================== STRIPE WEBHOOK ====================

/**
 * Handle Stripe webhook
 * Signature verification required
 */
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('⚠️  Stripe webhook secret not configured. Skipping signature verification.');
    const event = req.body;
    try {
      await paymentUtils.handleWebhook(event);
      return res.json({ received: true });
    } catch (err) {
      return res.status(400).json({ error: 'Webhook failed' });
    }
  }

  try {
    // Verify signature
    const event = JSON.parse(
      crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body), 'utf8')
        .digest() === sig
        ? JSON.stringify(req.body)
        : (() => {
            throw new Error('Invalid signature');
          })()
    );

    await paymentUtils.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({ error: 'Webhook error' });
  }
};

// ==================== NOTIFICATION TESTING ====================

/**
 * Test email configuration
 */
exports.testEmail = async (req, res) => {
  try {
    const result = await notificationUtils.testEmailConfig();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Email test failed', details: err.message });
  }
};

/**
 * Test SMS configuration
 */
exports.testSMS = async (req, res) => {
  try {
    const result = await notificationUtils.testSMSConfig();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'SMS test failed', details: err.message });
  }
};

/**
 * Send test email (admin only)
 */
exports.sendTestEmail = async (req, res) => {
  try {
    const { email, subject, message } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const result = await notificationUtils.sendEmail(
      email,
      subject || 'HealthPal Test Email',
      message || '<h2>This is a test email from HealthPal</h2><p>Email notifications are working correctly!</p>'
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test email', details: err.message });
  }
};

/**
 * Send test SMS (admin only)
 */
exports.sendTestSMS = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message required' });
    }

    const result = await notificationUtils.sendSMS(
      phone,
      message || 'HealthPal: This is a test SMS notification.'
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send test SMS', details: err.message });
  }
};

