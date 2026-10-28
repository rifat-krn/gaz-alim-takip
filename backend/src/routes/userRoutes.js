const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(adminOnly);

router.get('/notification-settings', userController.getNotificationSettings);
router.put('/notification-settings', userController.updateNotificationSettings);
router.post('/notification-settings/run-now', userController.triggerDailyCheckNow);
router.post('/notification-settings/send-test-email', userController.sendTestEmailGeneral);

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.post('/:id/send-test-email', userController.sendTestEmailForUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
