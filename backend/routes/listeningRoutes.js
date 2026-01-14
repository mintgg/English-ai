const express = require('express');
const router = express.Router();
const ListeningController = require('../controllers/listeningController');
const { authenticateJWT } = require('../middleware/auth');

// 获取听力列表
router.get('/', authenticateJWT, ListeningController.getListeningList);

// 获取单个听力详情
router.get('/:id', authenticateJWT, ListeningController.getListeningDetail);

// 获取听力音频
router.get('/:id/audio', authenticateJWT, ListeningController.getListeningAudio);

// 获取听力题目
router.get('/:id/questions', authenticateJWT, ListeningController.getListeningQuestions);

// 提交听力答案
router.post('/:id/answer', authenticateJWT, ListeningController.submitListeningAnswers);

// 获取用户听力历史
router.get('/user/history', authenticateJWT, ListeningController.getUserListeningHistory);

module.exports = router;