const { db } = require('../config/db');

// 写作控制器
class WritingController {
  // 获取写作列表
  static getWritingList(req, res) {
    const { page = 1, limit = 10, difficulty, type } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM writing WHERE 1=1';
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
    
    db.all(query, params, (err, writingList) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM writing WHERE 1=1' + 
             (difficulty ? ' AND difficulty = ' + difficulty : '') +
             (type ? ' AND type = ' + type : ''), (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }
        
        res.json({
          writingList,
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
  
  // 获取单个写作详情
  static getWritingDetail(req, res) {
    const { id } = req.params;
    
    db.get('SELECT * FROM writing WHERE id = ?', [id], (err, writing) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!writing) {
        return res.status(404).json({ message: '写作题目不存在' });
      }
      
      res.json(writing);
    });
  }
  
  // 提交写作答案
  static submitWritingAnswer(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const { answer } = req.body;
    
    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ message: '请提供写作答案' });
    }
    
    // 首先检查写作题目是否存在
    db.get('SELECT * FROM writing WHERE id = ?', [id], (err, writing) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      if (!writing) {
        return res.status(404).json({ message: '写作题目不存在' });
      }
      
      // 简单的写作评分算法（实际应用中可能需要更复杂的NLP算法）
      const score = calculateWritingScore(answer, writing);
      const feedback = generateWritingFeedback(answer, writing, score);
      
      // 记录用户写作记录
      const now = new Date();
      
      db.run(`
        INSERT INTO user_writing (user_id, writing_id, user_answer, score, feedback, submission_time)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, id, answer, score, feedback, now.toISOString()], (err) => {
        if (err) {
          console.error('创建用户写作记录失败:', err.message);
          return res.status(500).json({ message: '服务器错误' });
        }
        
        // 更新用户写作进度
        updateUserWritingProgress(userId);
        
        res.json({
          message: '写作提交成功',
          score,
          feedback,
          submissionTime: now.toISOString()
        });
      });
    });
  }
  
  // 获取写作模板
  static getWritingTemplates(req, res) {
    const { type } = req.query;
    
    // 这里简化处理，实际应该从数据库或文件中获取模板
    const templates = {
      essay: {
        title: '议论文模板',
        introduction: 'With the rapid development of society, more and more people are paying attention to the issue of ______________. Some people believe that ______________, while others argue that ______________. In my opinion, I agree with the former/latter view.',
        body1: 'First and foremost, ______________ is beneficial because ______________. For example, ______________. This shows that ______________.',
        body2: 'Furthermore, ______________ can also ______________. According to a recent survey, ______________. Therefore, ______________.',
        conclusion: 'In conclusion, based on the above analysis, I believe that ______________. It is high time that we ______________.'
      },
      chart: {
        title: '图表作文模板',
        introduction: 'The chart above shows/illustrates/reveals the changes in ______________ from ______________ to ______________. It is clear from the chart that ______________.',
        body1: 'According to the data, ______________ increased/decreased significantly from ______________ to ______________. In contrast, ______________ remained stable at ______________ during the same period.',
        body2: 'There are several factors that contribute to these changes. First, ______________. Second, ______________. Finally, ______________.',
        conclusion: 'In conclusion, the chart reflects the trend of ______________. It is predicted that ______________ in the future.'
      },
      letter: {
        title: '书信模板',
        greeting: 'Dear ______________,',
        introduction: 'I am writing to ______________ (state the purpose of the letter).',
        body1: 'First, I would like to ______________ (provide the first point). ______________ (supporting details).',
        body2: 'Additionally, I hope that ______________ (provide the second point). ______________ (supporting details).',
        conclusion: 'Thank you for your attention to this matter. I look forward to your reply.',
        closing: 'Sincerely/Yours faithfully,',
        signature: '______________'
      }
    };
    
    if (type && templates[type]) {
      res.json({ template: templates[type] });
    } else {
      res.json({ templates });
    }
  }
  
  // 获取用户写作历史
  static getUserWritingHistory(req, res) {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    db.all(`
      SELECT w.*, uw.user_answer, uw.score, uw.feedback, uw.submission_time
      FROM writing w
      JOIN user_writing uw ON w.id = uw.writing_id
      WHERE uw.user_id = ?
      ORDER BY uw.submission_time DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)], (err, history) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }
      
      // 获取总数
      db.get('SELECT COUNT(*) as total FROM user_writing WHERE user_id = ?', [userId], (err, result) => {
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

// 简单的写作评分算法
function calculateWritingScore(answer, writing) {
  // 实际应用中应该使用更复杂的NLP算法进行评分
  // 这里使用简单的启发式规则进行评分
  
  // 1. 字数评分（120-180字为最佳）
  const words = answer.trim().split(/\s+/).length;
  let lengthScore = 0;
  
  if (words >= 120 && words <= 180) {
    lengthScore = 25;
  } else if (words >= 100 && words < 120) {
    lengthScore = 20;
  } else if (words > 180 && words <= 200) {
    lengthScore = 20;
  } else {
    lengthScore = 10;
  }
  
  // 2. 语法和词汇多样性评分
  // 检查是否使用了复杂句型和高级词汇
  const complexSentencePatterns = [
    /not only.*but also/,
    /either.*or/,
    /neither.*nor/,
    /as well as/,
    /such as/,
    /for example/,
    /however/,
    /therefore/,
    /in addition/,
    /on the other hand/
  ];
  
  let complexityScore = 0;
  complexSentencePatterns.forEach(pattern => {
    if (pattern.test(answer)) {
      complexityScore += 2;
    }
  });
  
  complexityScore = Math.min(25, complexityScore);
  
  // 3. 内容相关性评分
  // 检查是否涵盖了题目要求的所有要点
  const topicKeywords = writing.topic.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  let relevanceScore = 0;
  
  topicKeywords.forEach(keyword => {
    if (answer.toLowerCase().includes(keyword)) {
      relevanceScore += 5;
    }
  });
  
  relevanceScore = Math.min(25, relevanceScore);
  
  // 4. 结构完整性评分
  // 检查是否有明确的开头、主体和结尾
  const hasIntroduction = /^(with|the|nowadays|recently|as|when|if)/i.test(answer.trim());
  const hasConclusion = /^(in conclusion|to sum up|in summary|all in all|therefore)/i.test(answer.trim());
  const hasBody = answer.length > 100;
  
  let structureScore = 0;
  if (hasIntroduction) structureScore += 8;
  if (hasBody) structureScore += 8;
  if (hasConclusion) structureScore += 9;
  
  // 5. 语言准确性评分
  // 简单检查拼写和语法错误
  const commonMistakes = [
    /\bi am\b/gi,
    /\byou is\b/gi,
    /\bthey is\b/gi,
    /\bhe are\b/gi,
    /\bshe are\b/gi,
    /\bwe is\b/gi,
    /\bit are\b/gi,
    /\bcan not\b/gi,
    /\bdo not\b/gi,
    /\bhave not\b/gi
  ];
  
  let accuracyScore = 25;
  commonMistakes.forEach(mistake => {
    const matches = answer.match(mistake);
    if (matches) {
      accuracyScore -= matches.length * 2;
    }
  });
  
  accuracyScore = Math.max(0, accuracyScore);
  
  // 计算总分
  const totalScore = lengthScore + complexityScore + relevanceScore + structureScore + accuracyScore;
  
  // 转换为0-100分制
  return Math.min(100, Math.round(totalScore));
}

// 生成写作反馈
function generateWritingFeedback(answer, writing, score) {
  const feedback = [];
  
  // 总体评价
  if (score >= 90) {
    feedback.push('优秀：你的写作非常出色，内容充实，结构清晰，语言表达准确流畅。');
  } else if (score >= 80) {
    feedback.push('良好：你的写作整体表现良好，有一定的内容深度和语言表达能力。');
  } else if (score >= 70) {
    feedback.push('中等：你的写作基本符合要求，但还有提升空间。');
  } else if (score >= 60) {
    feedback.push('及格：你的写作勉强达到要求，但需要加强练习。');
  } else {
    feedback.push('需要提高：你的写作离要求还有一定差距，建议多练习。');
  }
  
  // 字数评价
  const words = answer.trim().split(/\s+/).length;
  if (words < 120) {
    feedback.push('字数不足：建议增加内容，使文章更加充实。');
  } else if (words > 180) {
    feedback.push('字数过多：建议精简内容，使文章更加简洁明了。');
  } else {
    feedback.push('字数合适：你的文章长度符合要求。');
  }
  
  // 结构评价
  const hasIntroduction = /^(with|the|nowadays|recently|as|when|if)/i.test(answer.trim());
  const hasConclusion = /^(in conclusion|to sum up|in summary|all in all|therefore)/i.test(answer.trim());
  
  if (!hasIntroduction) {
    feedback.push('结构建议：建议添加明确的开头部分，引出主题。');
  }
  
  if (!hasConclusion) {
    feedback.push('结构建议：建议添加总结性的结尾，概括主要观点。');
  }
  
  // 语言评价
  const complexSentencePatterns = [
    /not only.*but also/,
    /either.*or/,
    /neither.*nor/,
    /as well as/,
    /such as/,
    /for example/,
    /however/,
    /therefore/,
    /in addition/,
    /on the other hand/
  ];
  
  let patternCount = 0;
  complexSentencePatterns.forEach(pattern => {
    if (pattern.test(answer)) {
      patternCount++;
    }
  });
  
  if (patternCount < 3) {
    feedback.push('语言建议：建议使用更多的连接词和复杂句型，提高语言表达的多样性。');
  } else {
    feedback.push('语言评价：你使用了多种连接词和句型，语言表达较为丰富。');
  }
  
  // 内容评价
  const topicKeywords = writing.topic.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  let keywordCount = 0;
  
  topicKeywords.forEach(keyword => {
    if (answer.toLowerCase().includes(keyword)) {
      keywordCount++;
    }
  });
  
  const keywordRatio = keywordCount / topicKeywords.length;
  
  if (keywordRatio < 0.5) {
    feedback.push('内容建议：建议更多地围绕题目要求展开论述，确保内容的相关性。');
  } else {
    feedback.push('内容评价：你的文章内容与题目要求较为相关。');
  }
  
  // 改进建议
  feedback.push('改进建议：多阅读范文，积累常用表达和句型；定期练习写作，注意时间控制；写完后仔细检查语法和拼写错误。');
  
  return feedback.join('\n');
}

// 更新用户写作进度
function updateUserWritingProgress(userId) {
  db.get(`
    SELECT 
      COUNT(*) as total,
      AVG(score) as average_score
    FROM user_writing
    WHERE user_id = ?
  `, [userId], (err, result) => {
    if (err) {
      console.error('获取用户写作进度失败:', err.message);
      return;
    }
    
    db.run(`
      UPDATE progress 
      SET 
        writing_count = ?,
        writing_score = ?,
        last_update = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [result.total || 0, Math.round(result.average_score || 0), userId], (err) => {
      if (err) {
        console.error('更新用户写作进度失败:', err.message);
      }
    });
  });
}

module.exports = WritingController;