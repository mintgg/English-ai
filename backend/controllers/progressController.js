const { db } = require('../config/db');
const AILearningPath = require('../utils/ai');

// 进度控制器
class ProgressController {
  // 获取用户学习进度
  static getProgress(req, res) {
    const userId = req.user.id;
    
    db.get('SELECT * FROM progress WHERE user_id = ?', [userId], (err, progress) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!progress) {
        // 如果没有进度记录，创建一个新的
        db.run(
          'INSERT INTO progress (user_id) VALUES (?)',
          [userId],
          function(err) {
            if (err) {
              return res.status(500).json({ message: '服务器错误' });
            }
            
            db.get('SELECT * FROM progress WHERE id = ?', [this.lastID], (err, newProgress) => {
              if (err) {
                return res.status(500).json({ message: '服务器错误' });
              }
              
              res.json(newProgress);
            });
          }
        );
        return;
      }
      
      res.json(progress);
    });
  }
  
  // 获取用户技能雷达图数据
  static getSkillsData(req, res) {
    const userId = req.user.id;
    
    AILearningPath.generateSkillsData(userId)
      .then(skillsData => {
        res.json(skillsData);
      })
      .catch(err => {
        console.error('生成技能数据失败:', err.message);
        res.status(500).json({ message: '服务器错误' });
      });
  }
  
  // 获取AI学习路径建议
  static getAILearningPath(req, res) {
    const userId = req.user.id;
    
    AILearningPath.generateLearningPath(userId)
      .then(learningPath => {
        res.json(learningPath);
      })
      .catch(err => {
        console.error('生成学习路径失败:', err.message);
        res.status(500).json({ message: '服务器错误' });
      });
  }
  
  // 获取预测分数
  static getPredictedScore(req, res) {
    const userId = req.user.id;
    
    AILearningPath.predictScore(userId)
      .then(prediction => {
        res.json(prediction);
      })
      .catch(err => {
        console.error('预测分数失败:', err.message);
        res.status(500).json({ message: '服务器错误' });
      });
  }
}

module.exports = ProgressController;