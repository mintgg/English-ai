const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const authConfig = require('../config/auth');

// 认证中间件
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1]; // Bearer token

  jwt.verify(token, authConfig.jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的认证令牌' });
    }

    req.user = user;
    next();
  });
};

// 可选认证中间件（不强制要求登录，但如果提供了有效令牌则解析用户信息）
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(' ')[1]; // Bearer token

  jwt.verify(token, authConfig.jwtSecret, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

// 检查用户是否被锁定
const checkUserLocked = (req, res, next) => {
  const { email } = req.body;

  db.get(
    'SELECT login_attempts, locked_until FROM users WHERE email = ?',
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingTime = Math.ceil(
          (new Date(user.locked_until) - new Date()) / (1000 * 60)
        );
        return res.status(403).json({
          message: `账户已被锁定，请${remainingTime}分钟后再试`
        });
      }

      next();
    }
  );
};

module.exports = {
  authenticateJWT,
  optionalAuth,
  checkUserLocked
};