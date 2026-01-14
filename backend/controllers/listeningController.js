const { db } = require('../config/db');

// 听力控制器
class ListeningController {
  // 获取听力列表
  static getListeningList(req, res) {
    const { page = 1, limit = 10, difficulty, type } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM listening WHERE 1=1';
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
    
    db.all(query, params, (err, listeningList) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM listening WHERE 1=1' + 
             (difficulty ? ' AND difficulty = ' + difficulty : '') +
             (type ? ' AND type = ' + type : ''), (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          listeningList,
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
  
  // 获取单个听力详情
  static getListeningDetail(req, res) {
    const { id } = req.params;
    
    db.get('SELECT * FROM listening WHERE id = ?', [id], (err, listening) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!listening) {
        return res.status(404).json({ message: '听力材料不存在' });
      }
      
      res.json(listening);
    });
  }
  
  // 获取听力音频
  static getListeningAudio(req, res) {
    const { id } = req.params;
    
    db.get('SELECT audio_url FROM listening WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!result || !result.audio_url) {
        return res.status(404).json({ message: '音频文件不存在' });
      }
      
      // 这里简化处理，实际应该根据audio_url返回真实的音频文件
      res.json({ audioUrl: result.audio_url });
    });
  }
  
  // 获取听力题目
  static getListeningQuestions(req, res) {
    const { id } = req.params;
    
    // 首先检查听力材料是否存在
    db.get('SELECT * FROM listening WHERE id = ?', [id], (err, listening) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!listening) {
        return res.status(404).json({ message: '听力材料不存在' });
      }
      
      // 获取题目
      db.all('SELECT * FROM listening_questions WHERE listening_id = ? ORDER BY id', [id], (err, questions) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          listening,
          questions
        });
      });
    });
  }
  
  // 提交听力答案
  static submitListeningAnswers(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: '请提供有效的答案' });
    }
    
    // 首先检查听力材料是否存在
    db.get('SELECT * FROM listening WHERE id = ?', [id], (err, listening) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!listening) {
        return res.status(404).json({ message: '听力材料不存在' });
      }
      
      // 获取所有题目和正确答案
      db.all('SELECT id, answer FROM listening_questions WHERE listening_id = ?', [id], (err, questions) => {
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
        db.get('SELECT * FROM user_listening WHERE user_id = ? AND listening_id = ?', [userId, id], (err, record) => {
          if (err) {
            console.error('获取用户听力记录失败:', err.message);
          }
          
          const now = new Date();
          
          if (record) {
            // 更新记录
            db.run(`
              UPDATE user_listening 
              SET completed = 1, score = ?, last_attempt = ?
              WHERE user_id = ? AND listening_id = ?
            `, [score, now.toISOString(), userId, id], (err) => {
              if (err) {
                console.error('更新用户听力记录失败:', err.message);
              }
            });
          } else {
            // 创建新记录
            db.run(`
              INSERT INTO user_listening (user_id, listening_id, completed, score, last_attempt)
              VALUES (?, ?, ?, ?, ?)
            `, [userId, id, 1, score, now.toISOString()], (err) => {
              if (err) {
                console.error('创建用户听力记录失败:', err.message);
              }
            });
          }
          
          // 更新用户听力进度
          updateUserListeningProgress(userId);
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
  
  // 获取用户听力历史
  static getUserListeningHistory(req, res) {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    db.all(`
      SELECT l.*, ul.score, ul.last_attempt
      FROM listening l
      JOIN user_listening ul ON l.id = ul.listening_id
      WHERE ul.user_id = ?
      ORDER BY ul.last_attempt DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)], (err, history) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM user_listening WHERE user_id = ?', [userId], (err, result) => {
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

// 更新用户听力进度
function updateUserListeningProgress(userId) {
  db.get(`
    SELECT 
      COUNT(*) as total,
      AVG(score) as average_score
    FROM user_listening
    WHERE user_id = ? AND completed = 1
  `, [userId], (err, result) => {
    if (err) {
      console.error('获取用户听力进度失败:', err.message);
      return;
    }
    
    db.run(`
      UPDATE progress 
      SET 
        listening_count = ?,
        listening_score = ?,
        last_update = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [result.total || 0, Math.round(result.average_score || 0), userId], (err) => {
      if (err) {
        console.error('更新用户听力进度失败:', err.message);
      }
    });
  });
}

module.exports = ListeningController;