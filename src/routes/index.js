const express = require('express');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const patientRoutes = require('./patients');
const doctorRoutes = require('./doctors');
const consultationRoutes = require('./consultations');
const messageRoutes = require('./messages');
const videoCallRoutes = require('./videoCalls');
const audioCallRoutes = require('./audioCalls');
const sponsorshipRoutes = require('./sponsorships');
const donationRoutes = require('./donations');
const medicineRoutes = require('./medicines');
const equipmentRoutes = require('./equipment');
const equipmentRequestRoutes = require('./equipmentRequests');
const healthGuideRoutes = require('./healthGuides');
const alertRoutes = require('./alerts');
const mentalHealthRoutes = require('./mentalHealth');
const ngoRoutes = require('./ngos');
const externalRoutes = require('./external');
const translationRoutes = require('./translation');

const router = express.Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/consultations', consultationRoutes);
router.use('/consultations', messageRoutes);
router.use('/consultations', videoCallRoutes);
router.use('/consultations', audioCallRoutes);
router.use('/sponsorships', sponsorshipRoutes);
router.use('/donations', donationRoutes);
router.use('/medicine-requests', medicineRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/equipment-requests', equipmentRequestRoutes);
router.use('/health-guides', healthGuideRoutes);
router.use('/alerts', alertRoutes);
router.use('/mental-health', mentalHealthRoutes);
router.use('/ngos', ngoRoutes);
router.use('/external', externalRoutes);
router.use('/translate', translationRoutes);

module.exports = router;

