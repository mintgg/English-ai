module.exports = {
  // JWT密钥
  jwtSecret: 'cet4_english_app_secret_key',
  
  // JWT过期时间（小时）
  jwtExpiration: 24,
  
  // 密码加密强度
  bcryptSaltRounds: 10,
  
  // 登录尝试次数限制
  maxLoginAttempts: 5,
  
  // 登录锁定时间（分钟）
  lockoutDuration: 30
};