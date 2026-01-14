const express = require('express');
const router = express.Router();
const ReadingController = require('../controllers/readingController');
const { authenticateJWT } = require('../middleware/auth');

// 获取阅读列表
router.get('/', authenticateJWT, ReadingController.getReadingList);

// 获取单个阅读详情
router.get('/:id', authenticateJWT, ReadingController.getReadingDetail);

// 获取阅读题目
router.get('/:id/questions', authenticateJWT, ReadingController.getReadingQuestions);

// 提交阅读答案
router.post('/:id/answer', authenticateJWT, ReadingController.submitReadingAnswers);

// 获取用户阅读历史
router.get('/user/history', authenticateJWT, ReadingController.getUserReadingHistory);

module.exports = router;