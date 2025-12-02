const pool = require('../config/database');
const notificationUtils = require('../utils/notificationUtils');

/**
 * Create a donation (no real payment verification needed)
 * Accepts 'card' or 'bank' as payment methods
 */
exports.createDonation = async (req, res) => {
  try {
    const { sponsorship_id, amount, payment_method } = req.body;
    const donor_id = req.user.id;

    // Validate input
    if (!sponsorship_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: sponsorship_id, amount, payment_method' });
    }

    // Validate amount
    if (amount <= 0 || isNaN(amount)) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Validate payment method
    const validMethods = ['card', 'bank'];
    if (!validMethods.includes(payment_method.toLowerCase())) {
      return res.status(400).json({ error: 'Payment method must be either "card" or "bank"' });
    }

    // Verify sponsorship exists and is open
    const [sponsorships] = await pool.execute(
      'SELECT id, goal_amount, donated_amount, patient_id FROM sponsorships WHERE id = ?',
      [sponsorship_id]
    );

    if (sponsorships.length === 0) {
      return res.status(404).json({ error: 'Sponsorship not found' });
    }

    const sponsorship = sponsorships[0];

    // Check if sponsorship is already fully funded
    const currentDonated = parseFloat(sponsorship.donated_amount || 0);
    const goalAmount = parseFloat(sponsorship.goal_amount);
    
    if (currentDonated >= goalAmount) {
      return res.status(400).json({ error: 'This sponsorship is already fully funded' });
    }

    // Insert transaction record
    // Try with status field first, fall back to without if column doesn't exist
    let result;
    try {
      [result] = await pool.execute(
        `INSERT INTO transactions (sponsorship_id, donor_id, amount, payment_method, status, created_at)
         VALUES (?, ?, ?, ?, 'completed', NOW())`,
        [sponsorship_id, donor_id, amount, payment_method.toLowerCase()]
      );
    } catch (err) {
      // If status column doesn't exist, insert without it
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage.includes('status')) {
        console.warn('Status column not found. Adding donation without status field.');
        [result] = await pool.execute(
          `INSERT INTO transactions (sponsorship_id, donor_id, amount, payment_method, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [sponsorship_id, donor_id, amount, payment_method.toLowerCase()]
        );
      } else {
        throw err;
      }
    }

    const transactionId = result.insertId;

    // Update sponsorship donated_amount
    const newDonated = currentDonated + parseFloat(amount);
    await pool.execute(
      'UPDATE sponsorships SET donated_amount = ? WHERE id = ?',
      [newDonated, sponsorship_id]
    );

    // Check if sponsorship is now fully funded
    let isFunded = false;
    if (newDonated >= goalAmount) {
      await pool.execute(
        'UPDATE sponsorships SET status = ? WHERE id = ?',
        ['funded', sponsorship_id]
      );
      isFunded = true;
    }

    // Get donor and patient info for notifications
    const [donorResult] = await pool.execute(
      'SELECT email, phone, full_name FROM users WHERE id = ?',
      [donor_id]
    );

    const [patientResult] = await pool.execute(
      'SELECT u.email, u.full_name, s.treatment_type FROM users u JOIN sponsorships s ON s.patient_id = u.id WHERE s.id = ?',
      [sponsorship_id]
    );

    if (donorResult.length > 0) {
      const donorInfo = donorResult[0];
      const patientInfo = patientResult[0];

      // Send confirmation email to donor
      await notificationUtils.sendDonationConfirmationEmail(
        donorInfo.email,
        donorInfo.full_name,
        amount,
        patientInfo.full_name,
        null // No receipt URL for demo donations
      );

      // Send SMS if phone is available
      if (donorInfo.phone) {
        await notificationUtils.sendDonationConfirmationSMS(
          donorInfo.phone,
          amount,
          patientInfo.full_name
        );
      }
    }

    // Notify patient if sponsorship is now fully funded
    if (isFunded && patientResult.length > 0) {
      const patientInfo = patientResult[0];
      await notificationUtils.sendSponsorshipFundedEmail(
        patientInfo.email,
        patientInfo.full_name,
        patientInfo.treatment_type,
        newDonated
      );
    }

    res.status(201).json({
      success: true,
      transactionId: transactionId,
      message: 'Donation successful',
      amount: amount,
      payment_method: payment_method.toLowerCase(),
      status: 'completed',
      isFunded: isFunded,
      sponsorship_funded_amount: newDonated,
      sponsorship_goal: goalAmount
    });

  } catch (err) {
    console.error('Donation error:', err);
    res.status(500).json({ error: 'Failed to process donation', details: err.message });
  }
};

/**
 * Get donation history for a donor
 */
exports.getDonationHistory = async (req, res) => {
  try {
    const donor_id = req.user.id;

    const [donations] = await pool.execute(
      `SELECT t.id, t.sponsorship_id, t.amount, t.payment_method, t.status, t.created_at,
              s.treatment_type, u.full_name as patient_name, s.goal_amount, s.donated_amount
       FROM transactions t
       JOIN sponsorships s ON t.sponsorship_id = s.id
       JOIN users u ON s.patient_id = u.id
       WHERE t.donor_id = ? AND t.status = 'completed'
       ORDER BY t.created_at DESC`,
      [donor_id]
    );

    res.json({
      donations: donations,
      total_donations: donations.length,
      total_amount_donated: donations.reduce((sum, d) => sum + parseFloat(d.amount), 0)
    });
  } catch (err) {
    console.error('Error fetching donation history:', err);
    res.status(500).json({ error: 'Failed to fetch donation history', details: err.message });
  }
};

/**
 * Get all donations for a specific sponsorship
 */
exports.getSponsorshipDonations = async (req, res) => {
  try {
    const sponsorship_id = req.params.sponsorshipId;

    const [donations] = await pool.execute(
      `SELECT t.id, t.donor_id, u.full_name as donor_name, t.amount, t.payment_method, t.status, t.created_at
       FROM transactions t
       JOIN users u ON t.donor_id = u.id
       WHERE t.sponsorship_id = ? AND t.status = 'completed'
       ORDER BY t.created_at DESC`,
      [sponsorship_id]
    );

    res.json(donations);
  } catch (err) {
    console.error('Error fetching sponsorship donations:', err);
    res.status(500).json({ error: 'Failed to fetch sponsorship donations', details: err.message });
  }
};

/**
 * Get donation statistics by payment method
 */
exports.getDonationStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(
      `SELECT 
        payment_method,
        COUNT(*) as donation_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
       FROM transactions
       WHERE status = 'completed'
       GROUP BY payment_method`
    );

    res.json(stats);
  } catch (err) {
    console.error('Error fetching donation stats:', err);
    res.status(500).json({ error: 'Failed to fetch donation statistics', details: err.message });
  }
};
