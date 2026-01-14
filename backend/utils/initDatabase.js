const { db, initTables } = require('../config/db');
const fs = require('fs');
const path = require('path');

// 初始化数据库
const initDatabase = () => {
  console.log('开始初始化数据库...');
  
  // 创建表
  initTables();
  
  // 导入词汇数据
  const vocabularyData = require('../data/vocabulary.json');
  const vocabularyStmt = db.prepare(`
    INSERT INTO vocabulary (word, phonetic, definition, example, category, difficulty)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  db.serialize(() => {
    // 开始事务
    db.run('BEGIN TRANSACTION');
    
    // 清空现有数据
    db.run('DELETE FROM vocabulary');
    
    // 插入新数据
    vocabularyData.forEach(word => {
      vocabularyStmt.run(
        word.word,
        word.phonetic,
        word.definition,
        word.example,
        word.category,
        word.difficulty
      );
    });
    
    vocabularyStmt.finalize();
    
    // 导入听力数据
    const listeningData = require('../data/listening.json');
    const listeningStmt = db.prepare(`
      INSERT INTO listening (title, audio_url, transcript, difficulty, type)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const listeningQuestionStmt = db.prepare(`
      INSERT INTO listening_questions (listening_id, question, option_a, option_b, option_c, option_d, answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    db.run('DELETE FROM listening_questions');
    db.run('DELETE FROM listening');
    
    listeningData.forEach(item => {
      db.run(listeningStmt, [
        item.title,
        item.audio_url,
        item.transcript,
        item.difficulty,
        item.type
      ], function(err) {
        if (err) {
          console.error('插入听力数据失败:', err.message);
          return;
        }
        
        const listeningId = this.lastID;
        
        item.questions.forEach(question => {
          listeningQuestionStmt.run(
            listeningId,
            question.question,
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
            question.answer,
            question.explanation
          );
        });
      });
    });
    
    listeningStmt.finalize();
    listeningQuestionStmt.finalize();
    
    // 导入阅读数据
    const readingData = require('../data/reading.json');
    const readingStmt = db.prepare(`
      INSERT INTO reading (title, content, difficulty, type)
      VALUES (?, ?, ?, ?)
    `);
    
    const readingQuestionStmt = db.prepare(`
      INSERT INTO reading_questions (reading_id, question, option_a, option_b, option_c, option_d, answer, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    db.run('DELETE FROM reading_questions');
    db.run('DELETE FROM reading');
    
    readingData.forEach(item => {
      db.run(readingStmt, [
        item.title,
        item.content,
        item.difficulty,
        item.type
      ], function(err) {
        if (err) {
          console.error('插入阅读数据失败:', err.message);
          return;
        }
        
        const readingId = this.lastID;
        
        item.questions.forEach(question => {
          readingQuestionStmt.run(
            readingId,
            question.question,
            question.option_a,
            question.option_b,
            question.option_c,
            question.option_d,
            question.answer,
            question.explanation
          );
        });
      });
    });
    
    readingStmt.finalize();
    readingQuestionStmt.finalize();
    
    // 导入写作数据
    const writingData = require('../data/writing.json');
    const writingStmt = db.prepare(`
      INSERT INTO writing (title, topic, type, difficulty, model_answer)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.run('DELETE FROM writing');
    
    writingData.forEach(item => {
      writingStmt.run(
        item.title,
        item.topic,
        item.type,
        item.difficulty,
        item.model_answer
      );
    });
    
    writingStmt.finalize();
    
    // 提交事务
    db.run('COMMIT', () => {
      console.log('数据库初始化完成');
      db.close();
    });
  });
};

// 执行初始化
initDatabase();