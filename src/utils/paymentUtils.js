const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Stripe is optional - only initialize if secret key is provided
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.warn('Stripe module not available or not configured. Payment features will be limited.');
}

/**
 * Check if Stripe is configured
 */
const isStripeConfigured = () => {
  return stripe !== null && process.env.STRIPE_SECRET_KEY;
};

/**
 * Create a payment intent for donation
 */
exports.createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    if (!isStripeConfigured()) {
      return {
        success: false,
        error: 'Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable.'
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      description: 'HealthPal Medical Sponsorship Donation'
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100
    };
  } catch (error) {
    console.error('Stripe error creating payment intent:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Confirm payment and create transaction record
 */
exports.confirmPayment = async (paymentIntentId, sponsorshipId, donorId, amount) => {
  try {
    if (!isStripeConfigured()) {
      return {
        success: false,
        error: 'Payment processing is not configured.'
      };
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return {
        success: false,
        error: `Payment status: ${paymentIntent.status}`
      };
    }

    // Get charge details
    const charges = await stripe.charges.list({
      payment_intent: paymentIntentId,
      limit: 1
    });

    const charge = charges.data[0];

    // Save transaction to database
    const [result] = await pool.execute(
      `INSERT INTO transactions 
       (sponsorship_id, donor_id, amount, payment_method, receipt_url, stripe_payment_id, stripe_charge_id, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        sponsorshipId,
        donorId,
        amount,
        'stripe_card',
        charge.receipt_url || null,
        paymentIntentId,
        charge.id,
        'completed'
      ]
    );

    // Update sponsorship donated_amount
    const [sponsorship] = await pool.execute(
      'SELECT donated_amount FROM sponsorships WHERE id = ?',
      [sponsorshipId]
    );

    if (sponsorship.length === 0) {
      throw new Error('Sponsorship not found');
    }

    const currentDonated = parseFloat(sponsorship[0].donated_amount || 0);
    const newDonated = currentDonated + amount;

    await pool.execute(
      'UPDATE sponsorships SET donated_amount = ? WHERE id = ?',
      [newDonated, sponsorshipId]
    );

    // Check if sponsorship is now fully funded
    const [updatedSponsorship] = await pool.execute(
      'SELECT goal_amount, donated_amount FROM sponsorships WHERE id = ?',
      [sponsorshipId]
    );

    const isFunded =
      parseFloat(updatedSponsorship[0].donated_amount) >=
      parseFloat(updatedSponsorship[0].goal_amount);

    if (isFunded) {
      await pool.execute(
        'UPDATE sponsorships SET status = ? WHERE id = ?',
        ['funded', sponsorshipId]
      );
    }

    return {
      success: true,
      transactionId: result.insertId,
      receiptUrl: charge.receipt_url,
      amount,
      status: 'completed',
      isFunded
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create refund
 */
exports.createRefund = async (paymentIntentId, amount) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100) // Convert to cents
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    console.error('Stripe refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Handle Stripe webhook
 */
exports.handleWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✅ Payment succeeded:', event.data.object.id);
        // Additional logic can be added here
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        // Update transaction status
        await pool.execute(
          'UPDATE transactions SET status = ? WHERE stripe_payment_id = ?',
          ['failed', event.data.object.id]
        );
        break;

      case 'charge.refunded':
        console.log('💰 Refund processed:', event.data.object.id);
        // Update transaction status
        await pool.execute(
          'UPDATE transactions SET status = ? WHERE stripe_charge_id = ?',
          ['refunded', event.data.object.id]
        );
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get transaction history
 */
exports.getTransactionHistory = async (sponsorshipId) => {
  try {
    const [transactions] = await pool.execute(
      `SELECT t.*, u.full_name, u.email 
       FROM transactions t
       JOIN users u ON t.donor_id = u.id
       WHERE t.sponsorship_id = ?
       ORDER BY t.created_at DESC`,
      [sponsorshipId]
    );

    return transactions;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

/**
 * Calculate fundraising statistics
 */
exports.getFundraisingStats = async (sponsorshipId) => {
  try {
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) as total_donors,
         SUM(amount) as total_raised,
         AVG(amount) as avg_donation,
         MAX(amount) as highest_donation,
         MIN(amount) as lowest_donation
       FROM transactions
       WHERE sponsorship_id = ? AND status = 'completed'`,
      [sponsorshipId]
    );

    return stats[0] || {};
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {};
  }
};
