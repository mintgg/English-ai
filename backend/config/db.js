const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.resolve(__dirname, '../data/cet4_app.db');

// 创建数据库连接
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// 初始化数据库表
const initTables = () => {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `);

  // 词汇表
  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      phonetic TEXT,
      definition TEXT NOT NULL,
      example TEXT,
      category TEXT,
      difficulty INTEGER DEFAULT 1
    )
  `);

  // 用户词汇学习记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      status TEXT DEFAULT 'new',
      last_review TIMESTAMP,
      next_review TIMESTAMP,
      review_count INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (word_id) REFERENCES vocabulary (id)
    )
  `);

  // 听力表
  db.run(`
    CREATE TABLE IF NOT EXISTS listening (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      transcript TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      type TEXT DEFAULT 'short'
    )
  `);

  // 听力题目表
  db.run(`
    CREATE TABLE IF NOT EXISTS listening_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listening_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY (listening_id) REFERENCES listening (id)
    )
  `);

  // 用户听力记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_listening (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      listening_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      score INTEGER DEFAULT 0,
      last_attempt TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (listening_id) REFERENCES listening (id)
    )
  `);

  // 阅读表
  db.run(`
    CREATE TABLE IF NOT EXISTS reading (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      type TEXT DEFAULT 'careful'
    )
  `);

  // 阅读题目表
  db.run(`
    CREATE TABLE IF NOT EXISTS reading_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      FOREIGN KEY (reading_id) REFERENCES reading (id)
    )
  `);

  // 用户阅读记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_reading (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      reading_id INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      score INTEGER DEFAULT 0,
      last_attempt TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (reading_id) REFERENCES reading (id)
    )
  `);

  // 写作表
  db.run(`
    CREATE TABLE IF NOT EXISTS writing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      type TEXT DEFAULT 'essay',
      difficulty INTEGER DEFAULT 1,
      model_answer TEXT
    )
  `);

  // 用户写作记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_writing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      writing_id INTEGER NOT NULL,
      user_answer TEXT,
      score INTEGER,
      feedback TEXT,
      submission_time TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (writing_id) REFERENCES writing (id)
    )
  `);

  // 学习进度表
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vocabulary_count INTEGER DEFAULT 0,
      listening_count INTEGER DEFAULT 0,
      reading_count INTEGER DEFAULT 0,
      writing_count INTEGER DEFAULT 0,
      vocabulary_score REAL DEFAULT 0,
      listening_score REAL DEFAULT 0,
      reading_score REAL DEFAULT 0,
      writing_score REAL DEFAULT 0,
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
};

module.exports = {
  db,
  initTables
};