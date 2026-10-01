const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(adminOnly);

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
