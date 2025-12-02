/**
 * Input Validation Middleware
 * Uses express-validator for comprehensive request validation
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result handler middleware
 * Catches and formats validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// ==================== AUTH VALIDATION ====================

const validateRegister = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one digit'),
  body('role')
    .isIn(['patient', 'doctor', 'donor', 'ngo', 'admin']).withMessage('Invalid role'),
  body('phone')
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number format'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// ==================== USER PROFILE VALIDATION ====================

const validateUpdateProfile = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
  body('phone')
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number format'),
  handleValidationErrors
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain digit'),
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  handleValidationErrors
];

// ==================== DOCTOR PROFILE VALIDATION ====================

const validateDoctorProfile = [
  body('specialty')
    .trim()
    .notEmpty().withMessage('Specialty is required')
    .isLength({ min: 2, max: 100 }).withMessage('Specialty must be 2-100 characters'),
  body('license_no')
    .trim()
    .notEmpty().withMessage('License number is required')
    .isLength({ min: 5, max: 50 }).withMessage('Invalid license number format'),
  body('experience_years')
    .isInt({ min: 0, max: 70 }).withMessage('Experience years must be 0-70'),
  body('consultation_fee')
    .isFloat({ min: 0, max: 10000 }).withMessage('Fee must be between 0 and 10000'),
  handleValidationErrors
];

// ==================== CONSULTATION VALIDATION ====================

const validateConsultation = [
  body('doctor_id')
    .isInt({ min: 1 }).withMessage('Valid doctor ID is required'),
  body('consultation_date')
    .isISO8601().withMessage('Valid date-time is required')
    .custom(value => new Date(value) > new Date())
    .withMessage('Consultation date must be in the future'),
  body('mode')
    .isIn(['video', 'audio', 'chat']).withMessage('Mode must be video, audio, or chat'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
  handleValidationErrors
];

// ==================== SPONSORSHIP VALIDATION ====================

const validateSponsorship = [
  body('treatment_type')
    .trim()
    .notEmpty().withMessage('Treatment type is required')
    .isLength({ min: 2, max: 100 }).withMessage('Treatment type must be 2-100 characters'),
  body('goal_amount')
    .isFloat({ min: 0, max: 1000000 }).withMessage('Goal amount must be between 0 and 1000000'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  handleValidationErrors
];

// ==================== MEDICINE REQUEST VALIDATION ====================

const validateMedicineRequest = [
  body('medicine_name')
    .trim()
    .notEmpty().withMessage('Medicine name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Medicine name must be 2-100 characters'),
  body('quantity')
    .isInt({ min: 1, max: 10000 }).withMessage('Quantity must be 1-10000'),
  body('urgency')
    .isIn(['low', 'medium', 'high']).withMessage('Urgency must be low, medium, or high'),
  handleValidationErrors
];

// ==================== EQUIPMENT VALIDATION ====================

const validateEquipment = [
  body('item_name')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Item name must be 2-100 characters'),
  body('quantity')
    .isInt({ min: 1, max: 10000 }).withMessage('Quantity must be 1-10000'),
  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ min: 2, max: 200 }).withMessage('Location must be 2-200 characters'),
  handleValidationErrors
];

// ==================== HEALTH GUIDE VALIDATION ====================

const validateHealthGuide = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 5000 }).withMessage('Description must be 20-5000 characters'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['first-aid', 'chronic-illness', 'nutrition', 'maternal-care', 'mental-health', 'other'])
    .withMessage('Invalid category'),
  body('language')
    .isIn(['ar', 'en']).withMessage('Language must be Arabic (ar) or English (en)'),
  handleValidationErrors
];

// ==================== ALERT VALIDATION ====================

const validateAlert = [
  body('type')
    .trim()
    .notEmpty().withMessage('Alert type is required')
    .isIn(['disease-outbreak', 'air-quality', 'medical-need', 'other'])
    .withMessage('Invalid alert type'),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters'),
  body('region')
    .trim()
    .notEmpty().withMessage('Region is required'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  handleValidationErrors
];

// ==================== PARAMETER VALIDATION ====================

const validateId = [
  param('id')
    .isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateDoctorProfile,
  validateConsultation,
  validateSponsorship,
  validateMedicineRequest,
  validateEquipment,
  validateHealthGuide,
  validateAlert,
  validateId
};
