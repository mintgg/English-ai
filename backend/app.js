const express = require('express');
const cors = require('cors');
const { db, initTables } = require('./config/db');

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 初始化数据库表
initTables();

// 路由
const userRoutes = require('./routes/userRoutes');
const vocabularyRoutes = require('./routes/vocabularyRoutes');
const listeningRoutes = require('./routes/listeningRoutes');
const readingRoutes = require('./routes/readingRoutes');
const writingRoutes = require('./routes/writingRoutes');
const progressRoutes = require('./routes/progressRoutes');

// API路由前缀
app.use('/api/users', userRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/listening', listeningRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/progress', progressRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({ message: 'CET-4 English Learning App API' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: '路由不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 优雅关闭数据库连接
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err.message);
    } else {
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  });
});