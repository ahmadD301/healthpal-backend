const express = require('express');
const mentalHealthController = require('../controllers/mentalHealthController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/authorize');

const router = express.Router();

// ==================== MENTAL HEALTH SESSIONS ====================

router.post('/sessions', authenticate, mentalHealthController.schedule);
router.get('/sessions', authenticate, mentalHealthController.getAll);

// ==================== SUPPORT GROUPS ====================

router.post('/support-groups', authenticate, authorize('counselor', 'doctor'), mentalHealthController.createSupportGroup);
router.get('/support-groups', authenticate, mentalHealthController.getAllGroups);
router.get('/support-groups/:id', authenticate, mentalHealthController.getGroupById);
router.post('/support-groups/:id/join', authenticate, mentalHealthController.joinGroup);
router.post('/support-groups/:id/leave', authenticate, mentalHealthController.leaveGroup);

// ==================== GROUP MESSAGING ====================

router.post('/support-groups/:id/messages', authenticate, mentalHealthController.sendGroupMessage);
router.get('/support-groups/:id/messages', authenticate, mentalHealthController.getGroupMessages);

// ==================== THERAPY RESOURCES ====================

router.post('/resources', authenticate, authorize('counselor', 'doctor'), mentalHealthController.createTherapyResource);
router.get('/resources', authenticate, mentalHealthController.getTherapyResources);
router.get('/resources/:id', authenticate, mentalHealthController.getResourceById);

// ==================== ANONYMOUS THERAPY CHAT ====================

router.post('/anonymous-chat', authenticate, mentalHealthController.startAnonymousChat);
router.post('/anonymous-chat/:id/messages', authenticate, mentalHealthController.sendAnonymousChatMessage);
router.get('/anonymous-chat/:id/messages', authenticate, mentalHealthController.getAnonymousChatMessages);
router.post('/anonymous-chat/:id/end', authenticate, mentalHealthController.endAnonymousChat);

module.exports = router;
