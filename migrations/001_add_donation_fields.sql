-- Migration: Add status and Stripe fields to transactions table
-- Date: 2025-12-02
-- Purpose: Support donation feature with payment method tracking and future Stripe integration

-- Check if columns exist and add them if they don't
-- Note: This script should be run manually or via a migration tool

USE healthpal;

-- Add status column if it doesn't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'completed', 'failed') DEFAULT 'completed';

-- Add Stripe fields if they don't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR(255);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);

-- Add index on status if it doesn't exist
ALTER TABLE transactions 
ADD INDEX IF NOT EXISTS idx_status (status);

-- Verify the new structure
DESCRIBE transactions;
