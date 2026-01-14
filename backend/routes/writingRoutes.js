const express = require('express');
const router = express.Router();
const WritingController = require('../controllers/writingController');
const { authenticateJWT } = require('../middleware/auth');

// 获取写作列表
router.get('/', authenticateJWT, WritingController.getWritingList);

// 获取单个写作详情
router.get('/:id', authenticateJWT, WritingController.getWritingDetail);

// 提交写作答案
router.post('/:id/submit', authenticateJWT, WritingController.submitWritingAnswer);

// 获取写作模板
router.get('/templates', authenticateJWT, WritingController.getWritingTemplates);

// 获取用户写作历史
router.get('/user/history', authenticateJWT, WritingController.getUserWritingHistory);

module.exports = router;