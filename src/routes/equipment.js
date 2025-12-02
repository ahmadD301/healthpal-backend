const express = require('express');
const equipmentController = require('../controllers/equipmentController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.post('/', authenticate, equipmentController.create);
router.get('/', authenticate, equipmentController.getAll);

module.exports = router;
