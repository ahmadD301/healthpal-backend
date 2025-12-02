const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateProfile);
router.post('/change-password', authenticate, userController.changePassword);

module.exports = router;
