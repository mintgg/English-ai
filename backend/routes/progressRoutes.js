const express = require('express');
const router = express.Router();
const ProgressController = require('../controllers/progressController');
const { authenticateJWT } = require('../middleware/auth');

// 获取用户学习进度
router.get('/', authenticateJWT, ProgressController.getProgress);

// 获取用户技能雷达图数据
router.get('/skills', authenticateJWT, ProgressController.getSkillsData);

// 获取AI学习路径建议
router.get('/ai-path', authenticateJWT, ProgressController.getAILearningPath);

// 获取预测分数
router.get('/predicted-score', authenticateJWT, ProgressController.getPredictedScore);

module.exports = router;