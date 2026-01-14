const { db } = require('../config/db');

// 词汇控制器
class VocabularyController {
  // 获取词汇列表
  static getVocabularyList(req, res) {
    const { page = 1, limit = 20, difficulty, category } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM vocabulary WHERE 1=1';
    const params = [];
    
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, words) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM vocabulary WHERE 1=1' + 
             (difficulty ? ' AND difficulty = ' + difficulty : '') +
             (category ? ' AND category = ' + category : ''), (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          words,
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
  
  // 获取单个词汇详情
  static getVocabularyDetail(req, res) {
    const { id } = req.params;
    
    db.get('SELECT * FROM vocabulary WHERE id = ?', [id], (err, word) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!word) {
        return res.status(404).json({ message: '词汇不存在' });
      }
      
      res.json(word);
    });
  }
  
  // 获取用户词汇学习记录
  static getUserVocabulary(req, res) {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT v.*, uv.status, uv.last_review, uv.next_review, uv.review_count
      FROM vocabulary v
      JOIN user_vocabulary uv ON v.id = uv.word_id
      WHERE uv.user_id = ?
    `;
    const params = [userId];
    
    if (status) {
      query += ' AND uv.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY uv.next_review LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, words) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM user_vocabulary WHERE user_id = ?' + 
             (status ? ' AND status = ' + status : ''), [userId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          words,
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
  
  // 提交词汇复习结果
  static submitVocabularyReview(req, res) {
    const userId = req.user.id;
    const { wordId, remembered } = req.body;
    
    if (!wordId || remembered === undefined) {
      return res.status(400).json({ message: '请提供完整的复习数据' });
    }
    
    // 检查词汇是否存在
    db.get('SELECT * FROM vocabulary WHERE id = ?', [wordId], (err, word) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!word) {
        return res.status(404).json({ message: '词汇不存在' });
      }
      
      // 查找用户词汇记录
      db.get('SELECT * FROM user_vocabulary WHERE user_id = ? AND word_id = ?', [userId, wordId], (err, record) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        const now = new Date();
        let reviewCount = 0;
        let nextReview = new Date();
        let status = 'new';
        
        if (record) {
          reviewCount = record.review_count + 1;
          
          // 根据记忆情况计算下次复习时间（间隔重复算法）
          if (remembered) {
            // 记住了，增加间隔
            const daysToAdd = Math.min(30, Math.pow(2, reviewCount - 1));
            nextReview.setDate(now.getDate() + daysToAdd);
            status = reviewCount >= 5 ? 'mastered' : 'learning';
          } else {
            // 没记住，减少间隔
            const daysToAdd = Math.max(1, Math.floor(Math.pow(2, reviewCount - 2)));
            nextReview.setDate(now.getDate() + daysToAdd);
            status = 'learning';
          }
          
          // 更新记录
          db.run(`
            UPDATE user_vocabulary 
            SET status = ?, last_review = ?, next_review = ?, review_count = ?
            WHERE user_id = ? AND word_id = ?
          `, [status, now.toISOString(), nextReview.toISOString(), reviewCount, userId, wordId], (err) => {
            if (err) {
              return res.status(500).json({ message: '服务器错误' });
            }
            
            // 更新用户进度
            updateUserVocabularyProgress(userId);
            
            res.json({
              message: '复习记录已更新',
              nextReview: nextReview.toISOString(),
              status,
              reviewCount
            });
          });
        } else {
          // 创建新记录
          nextReview.setDate(now.getDate() + 1);
          
          db.run(`
            INSERT INTO user_vocabulary (user_id, word_id, status, last_review, next_review, review_count)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [userId, wordId, 'learning', now.toISOString(), nextReview.toISOString(), 1], (err) => {
            if (err) {
              return res.status(500).json({ message: '服务器错误' });
            }
            
            // 更新用户进度
            updateUserVocabularyProgress(userId);
            
            res.json({
              message: '复习记录已创建',
              nextReview: nextReview.toISOString(),
              status: 'learning',
              reviewCount: 1
            });
          });
        }
      });
    });
  }
  
  // 获取词汇测试题目
  static getVocabularyTest(req, res) {
    const userId = req.user.id;
    const { difficulty, count = 10 } = req.query;
    
    let query = `
      SELECT v.*
      FROM vocabulary v
      LEFT JOIN user_vocabulary uv ON v.id = uv.word_id AND uv.user_id = ?
      WHERE 1=1
    `;
    const params = [userId];
    
    if (difficulty) {
      query += ' AND v.difficulty = ?';
      params.push(difficulty);
    }
    
    // 优先选择已学习但未掌握的词汇
    query += `
      ORDER BY 
        CASE 
          WHEN uv.status = 'learning' THEN 0
          WHEN uv.status IS NULL THEN 1
          ELSE 2
        END,
        RANDOM()
      LIMIT ?
    `;
    params.push(parseInt(count));
    
    db.all(query, params, (err, words) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 为每个词汇生成测试题目
      const testQuestions = words.map(word => {
        // 生成选项（1个正确答案 + 3个干扰项）
        const options = [word.definition];
        
        // 查找其他词汇的释义作为干扰项
        return new Promise((resolve) => {
          db.all(`
            SELECT definition FROM vocabulary 
            WHERE id != ? AND definition != ?
            ORDER BY RANDOM() LIMIT 3
          `, [word.id, word.definition], (err, distractors) => {
            if (err) {
              console.error('获取干扰项失败:', err.message);
              resolve({
                id: word.id,
                word: word.word,
                phonetic: word.phonetic,
                question: `What is the meaning of "${word.word}"?`,
                options: options.concat(distractors.map(d => d.definition)).sort(() => Math.random() - 0.5),
                answer: word.definition
              });
              return;
            }
            
            resolve({
              id: word.id,
              word: word.word,
              phonetic: word.phonetic,
              question: `What is the meaning of "${word.word}"?`,
              options: options.concat(distractors.map(d => d.definition)).sort(() => Math.random() - 0.5),
              answer: word.definition
            });
          });
        });
      });
      
      Promise.all(testQuestions).then(questions => {
        res.json({ questions });
      });
    });
  }
  
  // 提交词汇测试答案
  static submitVocabularyTest(req, res) {
    const userId = req.user.id;
    const { answers } = req.body;
    
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: '请提供有效的答案' });
    }
    
    let correctCount = 0;
    const results = [];
    
    // 验证答案
    const validateAnswers = async () => {
      for (const answer of answers) {
        const { wordId, selectedOption } = answer;
        
        if (!wordId || !selectedOption) {
          continue;
        }
        
        // 获取正确答案
        const word = await new Promise((resolve) => {
          db.get('SELECT * FROM vocabulary WHERE id = ?', [wordId], (err, word) => {
            if (err) {
              console.error('获取词汇失败:', err.message);
              resolve(null);
              return;
            }
            resolve(word);
          });
        });
        
        if (!word) {
          continue;
        }
        
        const isCorrect = word.definition === selectedOption;
        if (isCorrect) {
          correctCount++;
        }
        
        results.push({
          wordId,
          word: word.word,
          correctAnswer: word.definition,
          selectedAnswer: selectedOption,
          isCorrect
        });
        
        // 更新用户词汇学习记录
        await updateUserVocabularyRecord(userId, wordId, isCorrect);
      }
      
      // 更新用户词汇测试成绩
      await updateUserVocabularyScore(userId, correctCount, answers.length);
      
      return {
        totalQuestions: answers.length,
        correctAnswers: correctCount,
        score: Math.round((correctCount / answers.length) * 100),
        results
      };
    };
    
    validateAnswers().then(result => {
      res.json(result);
    }).catch(err => {
      console.error('验证答案失败:', err.message);
      res.status(500).json({ message: '服务器错误' });
    });
  }
}

// 更新用户词汇学习记录
function updateUserVocabularyRecord(userId, wordId, isCorrect) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM user_vocabulary WHERE user_id = ? AND word_id = ?', [userId, wordId], (err, record) => {
      if (err) {
        console.error('获取用户词汇记录失败:', err.message);
        resolve();
        return;
      }
      
      const now = new Date();
      let reviewCount = 0;
      let nextReview = new Date();
      let status = 'new';
      
      if (record) {
        reviewCount = record.review_count + 1;
        
        // 根据测试结果计算下次复习时间
        if (isCorrect) {
          const daysToAdd = Math.min(30, Math.pow(2, reviewCount - 1));
          nextReview.setDate(now.getDate() + daysToAdd);
          status = reviewCount >= 5 ? 'mastered' : 'learning';
        } else {
          const daysToAdd = Math.max(1, Math.floor(Math.pow(2, reviewCount - 2)));
          nextReview.setDate(now.getDate() + daysToAdd);
          status = 'learning';
        }
        
        db.run(`
          UPDATE user_vocabulary 
          SET status = ?, last_review = ?, next_review = ?, review_count = ?
          WHERE user_id = ? AND word_id = ?
        `, [status, now.toISOString(), nextReview.toISOString(), reviewCount, userId, wordId], (err) => {
          if (err) {
            console.error('更新用户词汇记录失败:', err.message);
          }
          resolve();
        });
      } else {
        nextReview.setDate(now.getDate() + (isCorrect ? 2 : 1));
        
        db.run(`
          INSERT INTO user_vocabulary (user_id, word_id, status, last_review, next_review, review_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, wordId, 'learning', now.toISOString(), nextReview.toISOString(), 1], (err) => {
          if (err) {
            console.error('创建用户词汇记录失败:', err.message);
          }
          resolve();
        });
      }
    });
  });
}

// 更新用户词汇进度
function updateUserVocabularyProgress(userId) {
  db.get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning
    FROM user_vocabulary
    WHERE user_id = ?
  `, [userId], (err, result) => {
    if (err) {
      console.error('获取用户词汇进度失败:', err.message);
      return;
    }
    
    db.run(`
      UPDATE progress 
      SET 
        vocabulary_count = ?,
        last_update = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [result.total || 0, userId], (err) => {
      if (err) {
        console.error('更新用户词汇进度失败:', err.message);
      }
    });
  });
}

// 更新用户词汇测试成绩
function updateUserVocabularyScore(userId, correctCount, totalCount) {
  return new Promise((resolve) => {
    const score = Math.round((correctCount / totalCount) * 100);
    
    db.get('SELECT vocabulary_score, vocabulary_count FROM progress WHERE user_id = ?', [userId], (err, progress) => {
      if (err) {
        console.error('获取用户进度失败:', err.message);
        resolve();
        return;
      }
      
      let newAverageScore = score;
      
      if (progress && progress.vocabulary_score > 0) {
        // 计算新的平均分
        const totalScore = progress.vocabulary_score * progress.vocabulary_count + score;
        const totalCount = progress.vocabulary_count + 1;
        newAverageScore = Math.round(totalScore / totalCount);
      }
      
      db.run(`
        UPDATE progress 
        SET 
          vocabulary_score = ?,
          last_update = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [newAverageScore, userId], (err) => {
        if (err) {
          console.error('更新用户词汇成绩失败:', err.message);
        }
        resolve();
      });
    });
  });
}

module.exports = VocabularyController;