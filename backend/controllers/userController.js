const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const authConfig = require('../config/auth');

// 用户控制器
class UserController {
  // 用户注册
  static register(req, res) {
    const { username, email, password } = req.body;

    // 验证输入
    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    // 检查用户名是否已存在
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (user) {
        return res.status(400).json({ message: '用户名已存在' });
      }

      // 检查邮箱是否已存在
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }

        if (user) {
          return res.status(400).json({ message: '邮箱已被注册' });
        }

        // 加密密码
        bcrypt.hash(password, authConfig.bcryptSaltRounds, (err, hash) => {
          if (err) {
            return res.status(500).json({ message: '服务器错误' });
          }

          // 创建新用户
          db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, hash],
            function(err) {
              if (err) {
                return res.status(500).json({ message: '服务器错误' });
              }

              // 创建用户进度记录
              db.run(
                'INSERT INTO progress (user_id) VALUES (?)',
                [this.lastID],
                (err) => {
                  if (err) {
                    console.error('创建用户进度记录失败:', err.message);
                  }

                  // 生成JWT令牌
                  const token = jwt.sign(
                    { id: this.lastID, username, email },
                    authConfig.jwtSecret,
                    { expiresIn: `${authConfig.jwtExpiration}h` }
                  );

                  res.status(201).json({
                    message: '注册成功',
                    token,
                    user: {
                      id: this.lastID,
                      username,
                      email
                    }
                  });
                }
              );
            }
          );
        });
      });
    });
  }

  // 用户登录
  static login(req, res) {
    const { email, password } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    // 查找用户
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (!user) {
        return res.status(401).json({ message: '邮箱或密码错误' });
      }

      // 检查密码
      bcrypt.compare(password, user.password_hash, (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }

        if (!result) {
          // 更新登录失败次数
          const newAttempts = (user.login_attempts || 0) + 1;
          let lockedUntil = null;

          // 如果失败次数达到限制，锁定账户
          if (newAttempts >= authConfig.maxLoginAttempts) {
            const lockoutTime = new Date();
            lockoutTime.setMinutes(lockoutTime.getMinutes() + authConfig.lockoutDuration);
            lockedUntil = lockoutTime.toISOString();
          }

          db.run(
            'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
            [newAttempts, lockedUntil, user.id],
            (err) => {
              if (err) {
                console.error('更新登录失败次数失败:', err.message);
              }

              if (lockedUntil) {
                return res.status(403).json({
                  message: `账户已被锁定，请${authConfig.lockoutDuration}分钟后再试`
                });
              }

              return res.status(401).json({ message: '邮箱或密码错误' });
            }
          );
          return;
        }

        // 重置登录失败次数
        db.run(
          'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id],
          (err) => {
            if (err) {
              console.error('重置登录失败次数失败:', err.message);
            }
          }
        );

        // 生成JWT令牌
        const token = jwt.sign(
          { id: user.id, username: user.username, email: user.email },
          authConfig.jwtSecret,
          { expiresIn: `${authConfig.jwtExpiration}h` }
        );

        res.json({
          message: '登录成功',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      });
    });
  }

  // 获取用户资料
  static getProfile(req, res) {
    const userId = req.user.id;

    db.get('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      res.json(user);
    });
  }

  // 更新用户资料
  static updateProfile(req, res) {
    const userId = req.user.id;
    const { username } = req.body;

    // 验证输入
    if (!username) {
      return res.status(400).json({ message: '请提供用户名' });
    }

    // 检查用户名是否已被其他用户使用
    db.get('SELECT * FROM users WHERE username = ? AND id != ?', [username, userId], (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (user) {
        return res.status(400).json({ message: '用户名已被使用' });
      }

      // 更新用户资料
      db.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [username, userId],
        (err) => {
          if (err) {
            return res.status(500).json({ message: '服务器错误' });
          }

          // 更新JWT中的用户名
          const updatedToken = jwt.sign(
            { id: userId, username, email: req.user.email },
            authConfig.jwtSecret,
            { expiresIn: `${authConfig.jwtExpiration}h` }
          );

          res.json({
            message: '资料更新成功',
            token: updatedToken,
            user: {
              id: userId,
              username,
              email: req.user.email
            }
          });
        }
      );
    });
  }

  // 修改密码
  static changePassword(req, res) {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // 验证输入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    // 获取用户信息
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ message: '服务器错误' });
      }

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 验证当前密码
      bcrypt.compare(currentPassword, user.password_hash, (err, result) => {
        if (err) {
          return res.status(500).json({ message: '服务器错误' });
        }

        if (!result) {
          return res.status(401).json({ message: '当前密码错误' });
        }

        // 加密新密码
        bcrypt.hash(newPassword, authConfig.bcryptSaltRounds, (err, hash) => {
          if (err) {
            return res.status(500).json({ message: '服务器错误' });
          }

          // 更新密码
          db.run(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hash, userId],
            (err) => {
              if (err) {
                return res.status(500).json({ message: '服务器错误' });
              }

              res.json({ message: '密码修改成功' });
            }
          );
        });
      });
    });
  }
}

module.exports = UserController;