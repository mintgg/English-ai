const express = require('express');
const router = express.Router();
const VocabularyController = require('../controllers/vocabularyController');
const { authenticateJWT } = require('../middleware/auth');

// 获取词汇列表
router.get('/', authenticateJWT, VocabularyController.getVocabularyList);

// 获取单个词汇详情
router.get('/:id', authenticateJWT, VocabularyController.getVocabularyDetail);

// 获取用户词汇学习记录
router.get('/user/records', authenticateJWT, VocabularyController.getUserVocabulary);

// 提交词汇复习结果
router.post('/review', authenticateJWT, VocabularyController.submitVocabularyReview);

// 获取词汇测试题目
router.get('/test', authenticateJWT, VocabularyController.getVocabularyTest);

// 提交词汇测试答案
router.post('/test', authenticateJWT, VocabularyController.submitVocabularyTest);

module.exports = router;