const { db } = require('../config/db');

// 阅读控制器
class ReadingController {
  // 获取阅读列表
  static getReadingList(req, res) {
    const { page = 1, limit = 10, difficulty, type } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM reading WHERE 1=1';
    const params = [];
    
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, readingList) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM reading WHERE 1=1' + 
             (difficulty ? ' AND difficulty = ' + difficulty : '') +
             (type ? ' AND type = ' + type : ''), (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          readingList,
          pagination: {
            total: result.total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  }
  
  // 获取单个阅读详情
  static getReadingDetail(req, res) {
    const { id } = req.params;
    
    db.get('SELECT * FROM reading WHERE id = ?', [id], (err, reading) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!reading) {
        return res.status(404).json({ message: '阅读材料不存在' });
      }
      
      res.json(reading);
    });
  }
  
  // 获取阅读题目
  static getReadingQuestions(req, res) {
    const { id } = req.params;
    
    // 首先检查阅读材料是否存在
    db.get('SELECT * FROM reading WHERE id = ?', [id], (err, reading) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!reading) {
        return res.status(404).json({ message: '阅读材料不存在' });
      }
      
      // 获取题目
      db.all('SELECT * FROM reading_questions WHERE reading_id = ? ORDER BY id', [id], (err, questions) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          reading,
          questions
        });
      });
    });
  }
  
  // 提交阅读答案
  static submitReadingAnswers(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: '请提供有效的答案' });
    }
    
    // 首先检查阅读材料是否存在
    db.get('SELECT * FROM reading WHERE id = ?', [id], (err, reading) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!reading) {
        return res.status(404).json({ message: '阅读材料不存在' });
      }
      
      // 获取所有题目和正确答案
      db.all('SELECT id, answer FROM reading_questions WHERE reading_id = ?', [id], (err, questions) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        // 创建答案映射
        const correctAnswers = {};
        questions.forEach(q => {
          correctAnswers[q.id] = q.answer;
        });
        
        // 验证用户答案
        let correctCount = 0;
        const results = [];
        
        answers.forEach(answer => {
          const { questionId, selectedAnswer } = answer;
          const correctAnswer = correctAnswers[questionId];
          
          if (correctAnswer) {
            const isCorrect = correctAnswer.toLowerCase() === selectedAnswer.toLowerCase();
            if (isCorrect) {
              correctCount++;
            }
            
            results.push({
              questionId,
              correctAnswer,
              selectedAnswer,
              isCorrect
            });
          }
        });
        
        // 计算得分
        const score = Math.round((correctCount / questions.length) * 100);
        
        // 记录用户答题记录
        db.get('SELECT * FROM user_reading WHERE user_id = ? AND reading_id = ?', [userId, id], (err, record) => {
          if (err) {
            console.error('获取用户阅读记录失败:', err.message);
          }
          
          const now = new Date();
          
          if (record) {
            // 更新记录
            db.run(`
              UPDATE user_reading 
              SET completed = 1, score = ?, last_attempt = ?
              WHERE user_id = ? AND reading_id = ?
            `, [score, now.toISOString(), userId, id], (err) => {
              if (err) {
                console.error('更新用户阅读记录失败:', err.message);
              }
            });
          } else {
            // 创建新记录
            db.run(`
              INSERT INTO user_reading (user_id, reading_id, completed, score, last_attempt)
              VALUES (?, ?, ?, ?, ?)
            `, [userId, id, 1, score, now.toISOString()], (err) => {
              if (err) {
                console.error('创建用户阅读记录失败:', err.message);
              }
            });
          }
          
          // 更新用户阅读进度
          updateUserReadingProgress(userId);
        });
        
        res.json({
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          score,
          results
        });
      });
    });
  }
  
  // 获取用户阅读历史
  static getUserReadingHistory(req, res) {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    db.all(`
      SELECT r.*, ur.score, ur.last_attempt
      FROM reading r
      JOIN user_reading ur ON r.id = ur.reading_id
      WHERE ur.user_id = ?
      ORDER BY ur.last_attempt DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)], (err, history) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM user_reading WHERE user_id = ?', [userId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          history,
          pagination: {
            total: result.total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  }
}

// 更新用户阅读进度
function updateUserReadingProgress(userId) {
  db.get(`
    SELECT 
      COUNT(*) as total,
      AVG(score) as average_score
    FROM user_reading
    WHERE user_id = ? AND completed = 1
  `, [userId], (err, result) => {
    if (err) {
      console.error('获取用户阅读进度失败:', err.message);
      return;
    }
    
    db.run(`
      UPDATE progress 
      SET 
        reading_count = ?,
        reading_score = ?,
        last_update = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [result.total || 0, Math.round(result.average_score || 0), userId], (err) => {
      if (err) {
        console.error('更新用户阅读进度失败:', err.message);
      }
    });
  });
}

module.exports = ReadingController;