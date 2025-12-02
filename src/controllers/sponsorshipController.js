const pool = require('../config/database');
const paymentUtils = require('../utils/paymentUtils');
const notificationUtils = require('../utils/notificationUtils');

// Create sponsorship campaign
exports.create = async (req, res) => {
  try {
    const { treatment_type, goal_amount, description } = req.body;

    if (!treatment_type || !goal_amount || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO sponsorships (patient_id, treatment_type, goal_amount, description, status, donated_amount, created_at) 
       VALUES (?, ?, ?, ?, 'open', 0, NOW())`,
      [req.user.id, treatment_type, goal_amount, description]
    );

    res.status(201).json({ 
      message: 'Sponsorship campaign created',
      sponsorshipId: result.insertId,
      status: 'open'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create campaign', details: err.message });
  }
};

// Get all open sponsorships
exports.getAll = async (req, res) => {
  try {
    const [sponsorships] = await pool.execute(
      `SELECT s.*, u.full_name as patient_name, p.age, p.location 
       FROM sponsorships s 
       JOIN users u ON s.patient_id = u.id 
       LEFT JOIN patient_profiles p ON s.patient_id = p.user_id 
       WHERE s.status = 'open'
       ORDER BY s.created_at DESC`
    );

    res.json(sponsorships);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsorships', details: err.message });
  }
};

// Get sponsorship by ID with donation history
exports.getById = async (req, res) => {
  try {
    const sponsorshipId = req.params.id;

    const [sponsorship] = await pool.execute(
      `SELECT s.*, u.full_name as patient_name, p.age, p.location, p.medical_history
       FROM sponsorships s 
       JOIN users u ON s.patient_id = u.id 
       LEFT JOIN patient_profiles p ON s.patient_id = p.user_id 
       WHERE s.id = ?`,
      [sponsorshipId]
    );

    if (sponsorship.length === 0) {
      return res.status(404).json({ error: 'Sponsorship not found' });
    }

    // Get donation history
    const [donations] = await pool.execute(
      `SELECT t.*, u.full_name as donor_name 
       FROM transactions t 
       JOIN users u ON t.donor_id = u.id 
       WHERE t.sponsorship_id = ? AND t.status = 'completed'
       ORDER BY t.created_at DESC`,
      [sponsorshipId]
    );

    // Get statistics
    const stats = await paymentUtils.getFundraisingStats(sponsorshipId);

    res.json({
      sponsorship: sponsorship[0],
      donations,
      statistics: stats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sponsorship', details: err.message });
  }
};

// Initiate payment (create payment intent)
exports.initiatePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    const sponsorshipId = req.params.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Verify sponsorship exists
    const [sponsorship] = await pool.execute(
      'SELECT id, goal_amount, donated_amount FROM sponsorships WHERE id = ?',
      [sponsorshipId]
    );

    if (sponsorship.length === 0) {
      return res.status(404).json({ error: 'Sponsorship not found' });
    }

    // Create payment intent with Stripe
    const paymentIntent = await paymentUtils.createPaymentIntent(amount, 'usd', {
      sponsorshipId,
      donorId: req.user.id
    });

    if (!paymentIntent.success) {
      return res.status(500).json({ error: paymentIntent.error });
    }

    res.json({
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId,
      amount: paymentIntent.amount
    });
  } catch (err) {
    res.status(500).json({ error: 'Payment initiation failed', details: err.message });
  }
};

// Confirm payment and record donation
exports.confirmDonation = async (req, res) => {
  try {
    const { paymentIntentId, amount } = req.body;
    const sponsorshipId = req.params.id;
    const donorId = req.user.id;

    // Confirm payment with Stripe
    const paymentResult = await paymentUtils.confirmPayment(
      paymentIntentId,
      sponsorshipId,
      donorId,
      amount
    );

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error });
    }

    // Get updated sponsorship and donor info for notifications
    const [sponsorship] = await pool.execute(
      `SELECT s.*, u.full_name as patient_name 
       FROM sponsorships s 
       JOIN users u ON s.patient_id = u.id 
       WHERE s.id = ?`,
      [sponsorshipId]
    );

    const [donor] = await pool.execute(
      'SELECT email, phone, full_name FROM users WHERE id = ?',
      [donorId]
    );

    if (sponsorship.length > 0 && donor.length > 0) {
      const donorInfo = donor[0];
      const sponsorshipInfo = sponsorship[0];
      const fundingPercentage = Math.round(
        (parseFloat(sponsorshipInfo.donated_amount) / parseFloat(sponsorshipInfo.goal_amount)) * 100
      );

      // Send confirmation emails and SMS
      await notificationUtils.sendDonationConfirmationEmail(
        donorInfo.email,
        donorInfo.full_name,
        amount,
        sponsorshipInfo.patient_name,
        paymentResult.receiptUrl
      );

      if (donorInfo.phone) {
        await notificationUtils.sendDonationConfirmationSMS(
          donorInfo.phone,
          amount,
          sponsorshipInfo.patient_name
        );
      }

      // Notify patient if sponsorship is fully funded
      if (paymentResult.isFunded) {
        const [patientUser] = await pool.execute(
          'SELECT email FROM users WHERE id = ?',
          [sponsorshipInfo.patient_id]
        );

        if (patientUser.length > 0) {
          await notificationUtils.sendSponsorshipFundedEmail(
            patientUser[0].email,
            sponsorshipInfo.patient_name,
            sponsorshipInfo.treatment_type,
            sponsorshipInfo.donated_amount
          );
        }
      }
    }

    res.json({
      success: true,
      transactionId: paymentResult.transactionId,
      message: 'Donation successful',
      receiptUrl: paymentResult.receiptUrl,
      isFunded: paymentResult.isFunded
    });
  } catch (err) {
    res.status(500).json({ error: 'Donation confirmation failed', details: err.message });
  }
};

// Legacy donate endpoint for backward compatibility
exports.donate = async (req, res) => {
  try {
    const { amount, paymentIntentId } = req.body;
    const sponsorshipId = req.params.id;

    if (!amount || !paymentIntentId) {
      return res.status(400).json({ error: 'Missing amount or paymentIntentId' });
    }

    // Use confirmDonation flow
    req.body.amount = amount;
    req.body.paymentIntentId = paymentIntentId;
    return exports.confirmDonation(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Donation failed', details: err.message });
  }
};

