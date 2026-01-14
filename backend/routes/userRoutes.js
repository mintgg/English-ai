const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { authenticateJWT, checkUserLocked } = require('../middleware/auth');

// 用户注册
router.post('/register', UserController.register);

// 用户登录
router.post('/login', checkUserLocked, UserController.login);

// 获取用户资料
router.get('/profile', authenticateJWT, UserController.getProfile);

// 更新用户资料
router.put('/profile', authenticateJWT, UserController.updateProfile);

// 修改密码
router.put('/password', authenticateJWT, UserController.changePassword);

module.exports = router;