const { db } = require('../config/db');

// AI学习路径算法
class AILearningPath {
  // 分析用户学习数据
  static analyzeUserData(userId) {
    return new Promise((resolve, reject) => {
      const userData = {
        vocabulary: {
          completed: 0,
          total: 0,
          averageScore: 0
        },
        listening: {
          completed: 0,
          total: 0,
          averageScore: 0
        },
        reading: {
          completed: 0,
          total: 0,
          averageScore: 0
        },
        writing: {
          completed: 0,
          total: 0,
          averageScore: 0
        }
      };

      // 获取词汇学习数据
      db.get(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as completed,
                AVG(CASE WHEN review_count > 0 THEN review_count ELSE NULL END) as average_score
         FROM user_vocabulary WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            userData.vocabulary.total = row.total || 0;
            userData.vocabulary.completed = row.completed || 0;
            userData.vocabulary.averageScore = row.average_score || 0;
          }

          // 获取听力学习数据
          db.get(
            `SELECT COUNT(*) as total, 
                    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                    AVG(CASE WHEN score > 0 THEN score ELSE NULL END) as average_score
             FROM user_listening WHERE user_id = ?`,
            [userId],
            (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (row) {
                userData.listening.total = row.total || 0;
                userData.listening.completed = row.completed || 0;
                userData.listening.averageScore = row.average_score || 0;
              }

              // 获取阅读学习数据
              db.get(
                `SELECT COUNT(*) as total, 
                        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                        AVG(CASE WHEN score > 0 THEN score ELSE NULL END) as average_score
                 FROM user_reading WHERE user_id = ?`,
                [userId],
                (err, row) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  if (row) {
                    userData.reading.total = row.total || 0;
                    userData.reading.completed = row.completed || 0;
                    userData.reading.averageScore = row.average_score || 0;
                  }

                  // 获取写作学习数据
                  db.get(
                    `SELECT COUNT(*) as total, 
                            SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) as completed,
                            AVG(CASE WHEN score > 0 THEN score ELSE NULL END) as average_score
                     FROM user_writing WHERE user_id = ?`,
                    [userId],
                    (err, row) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      
                      if (row) {
                        userData.writing.total = row.total || 0;
                        userData.writing.completed = row.completed || 0;
                        userData.writing.averageScore = row.average_score || 0;
                      }

                      resolve(userData);
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  // 生成技能雷达图数据
  static generateSkillsData(userId) {
    return new Promise((resolve, reject) => {
      this.analyzeUserData(userId)
        .then(userData => {
          // 计算各技能的掌握程度（0-100）
          const calculateProficiency = (data) => {
            if (data.total === 0) return 0;
            
            // 完成率占40%，平均分占60%
            const completionRate = (data.completed / data.total) * 100;
            const scoreRate = (data.averageScore / 100) * 100;
            
            return Math.round((completionRate * 0.4) + (scoreRate * 0.6));
          };

          const skillsData = {
            vocabulary: calculateProficiency(userData.vocabulary),
            listening: calculateProficiency(userData.listening),
            reading: calculateProficiency(userData.reading),
            writing: calculateProficiency(userData.writing),
            translation: Math.round((calculateProficiency(userData.reading) + calculateProficiency(userData.writing)) / 2)
          };

          // 目标能力值（根据用户的目标分数调整）
          const targetScore = 550; // 默认目标分数
          const targetSkillsData = {
            vocabulary: Math.min(90, skillsData.vocabulary + 10),
            listening: Math.min(90, skillsData.listening + 15),
            reading: Math.min(90, skillsData.reading + 5),
            writing: Math.min(90, skillsData.writing + 20),
            translation: Math.min(90, skillsData.translation + 10)
          };

          resolve({
            current: skillsData,
            target: targetSkillsData
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // 识别薄弱环节
  static identifyWeakPoints(userId) {
    return new Promise((resolve, reject) => {
      this.generateSkillsData(userId)
        .then(skillsData => {
          const weakPoints = [];
          const currentSkills = skillsData.current;
          
          // 找出得分低于60的项目
          for (const [skill, score] of Object.entries(currentSkills)) {
            if (score < 60) {
              weakPoints.push({
                skill,
                score,
                priority: 60 - score // 差值越大，优先级越高
              });
            }
          }
          
          // 按优先级排序
          weakPoints.sort((a, b) => b.priority - a.priority);
          
          resolve(weakPoints);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // 生成个性化学习建议
  static generateLearningPath(userId) {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.identifyWeakPoints(userId),
        this.analyzeUserData(userId)
      ])
        .then(([weakPoints, userData]) => {
          const learningPath = {
            today: [],
            thisWeek: [],
            focusAreas: []
          };

          // 确定本周重点关注领域
          weakPoints.forEach(point => {
            learningPath.focusAreas.push({
              skill: point.skill,
              suggestion: this.getSuggestionForSkill(point.skill)
            });
          });

          // 如果没有明显的薄弱环节，推荐均衡发展
          if (weakPoints.length === 0) {
            learningPath.focusAreas.push({
              skill: 'balanced',
              suggestion: '继续保持均衡发展，每周在各个模块上花费相似的时间。'
            });
          }

          // 生成今日推荐
          if (weakPoints.length > 0) {
            // 优先推荐薄弱环节的练习
            const topWeakPoint = weakPoints[0].skill;
            
            switch (topWeakPoint) {
              case 'vocabulary':
                learningPath.today.push({
                  activity: '词汇学习',
                  duration: 30,
                  description: '复习20个已学词汇，学习10个新词汇'
                });
                learningPath.today.push({
                  activity: '词汇测试',
                  duration: 15,
                  description: '完成一套词汇测试题，巩固记忆'
                });
                break;
              case 'listening':
                learningPath.today.push({
                  activity: '听力练习',
                  duration: 30,
                  description: '完成一篇听力篇章练习，重点关注细节理解'
                });
                learningPath.today.push({
                  activity: '精听训练',
                  duration: 20,
                  description: '选择一段听力材料进行逐句精听'
                });
                break;
              case 'reading':
                learningPath.today.push({
                  activity: '阅读理解',
                  duration: 30,
                  description: '完成两篇仔细阅读练习，注意时间控制'
                });
                learningPath.today.push({
                  activity: '长难句分析',
                  duration: 15,
                  description: '分析5个长难句结构，提高理解能力'
                });
                break;
              case 'writing':
                learningPath.today.push({
                  activity: '写作模板学习',
                  duration: 20,
                  description: '背诵并默写一个写作模板'
                });
                learningPath.today.push({
                  activity: '写作练习',
                  duration: 30,
                  description: '根据模板完成一篇作文'
                });
                break;
              case 'translation':
                learningPath.today.push({
                  activity: '翻译练习',
                  duration: 25,
                  description: '完成5个句子翻译练习，注意词汇选择'
                });
                learningPath.today.push({
                  activity: '翻译技巧学习',
                  duration: 20,
                  description: '学习翻译技巧，提高翻译准确性'
                });
                break;
            }
          } else {
            // 均衡推荐
            learningPath.today.push({
              activity: '词汇复习',
              duration: 15,
              description: '复习15个已学词汇'
            });
            learningPath.today.push({
              activity: '听力练习',
              duration: 20,
              description: '完成一篇听力练习'
            });
            learningPath.today.push({
              activity: '阅读理解',
              duration: 20,
              description: '完成一篇阅读练习'
            });
          }

          // 生成本周计划
          learningPath.thisWeek = this.generateWeeklyPlan(weakPoints);

          resolve(learningPath);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // 生成周计划
  static generateWeeklyPlan(weakPoints) {
    const weeklyPlan = [];
    
    // 每天的学习重点
    const dailyFocus = ['vocabulary', 'listening', 'reading', 'writing', 'translation', 'review', 'practice'];
    
    dailyFocus.forEach((focus, index) => {
      const day = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index];
      
      let activities = [];
      
      if (weakPoints.length > 0 && focus === weakPoints[0].skill) {
        // 如果是薄弱环节，增加学习时间
        activities = [
          {
            name: this.getActivityForSkill(focus),
            duration: 45,
            priority: 'high'
          }
        ];
      } else {
        // 常规学习
        activities = [
          {
            name: this.getActivityForSkill(focus),
            duration: 30,
            priority: 'medium'
          }
        ];
      }
      
      // 添加次要活动
      if (focus !== 'review' && focus !== 'practice') {
        activities.push({
          name: '词汇复习',
          duration: 15,
          priority: 'low'
        });
      }
      
      weeklyPlan.push({
        day,
        focus,
        activities
      });
    });
    
    return weeklyPlan;
  }

  // 根据技能获取活动建议
  static getActivityForSkill(skill) {
    switch (skill) {
      case 'vocabulary': return '词汇学习与测试';
      case 'listening': return '听力练习与精听';
      case 'reading': return '阅读理解训练';
      case 'writing': return '写作练习与模板学习';
      case 'translation': return '翻译技巧与实践';
      case 'review': return '本周内容复习';
      case 'practice': return '模拟测试练习';
      default: return '综合练习';
    }
  }

  // 根据技能获取学习建议
  static getSuggestionForSkill(skill) {
    switch (skill) {
      case 'vocabulary':
        return '建议每天花30分钟学习新词汇，20分钟复习旧词汇。使用间隔重复记忆法，重点关注高频词汇。';
      case 'listening':
        return '每天至少进行45分钟的听力训练，包括精听和泛听。精听时注意逐句理解，泛听时关注整体大意。';
      case 'reading':
        return '每天完成2-3篇阅读理解练习，控制时间。重点学习定位关键词和理解长难句的方法。';
      case 'writing':
        return '每周至少完成3篇作文练习，背诵并应用写作模板。注意积累高级词汇和句型，提高语言表达能力。';
      case 'translation':
        return '每天进行15-20分钟的翻译练习，关注汉英差异和常用表达。积累中国特色词汇的翻译方法。';
      default:
        return '保持均衡学习，定期进行模拟测试，及时查漏补缺。';
    }
  }

  // 预测考试分数
  static predictScore(userId) {
    return new Promise((resolve, reject) => {
      this.generateSkillsData(userId)
        .then(skillsData => {
          const currentSkills = skillsData.current;
          
          // 计算综合得分（0-100）
          const averageScore = (
            currentSkills.vocabulary * 0.25 +
            currentSkills.listening * 0.35 +
            currentSkills.reading * 0.35 +
            currentSkills.writing * 0.15 +
            currentSkills.translation * 0.15
          );
          
          // 转换为四级分数（0-710）
          const predictedScore = Math.round((averageScore / 100) * 710);
          
          // 计算各部分得分
          const scores = {
            listening: Math.round((currentSkills.listening / 100) * 249),
            reading: Math.round((currentSkills.reading / 100) * 249),
            writing: Math.round((currentSkills.writing / 100) * 106.5),
            translation: Math.round((currentSkills.translation / 100) * 106.5)
          };
          
          // 计算总分
          const totalScore = scores.listening + scores.reading + scores.writing + scores.translation;
          
          resolve({
            predictedScore: totalScore,
            breakdown: scores,
            confidence: this.calculateConfidence(currentSkills)
          });
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  // 计算预测分数的可信度
  static calculateConfidence(skills) {
    // 基于数据完整性和技能平衡性计算可信度
    let confidence = 70; // 基础可信度
    
    // 检查数据完整性
    const hasData = Object.values(skills).some(score => score > 0);
    if (!hasData) {
      return 30; // 没有足够数据
    }
    
    // 检查技能平衡性
    const scores = Object.values(skills);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差越小，可信度越高
    if (stdDev < 10) {
      confidence += 15;
    } else if (stdDev > 30) {
      confidence -= 15;
    }
    
    // 确保可信度在0-100之间
    return Math.min(100, Math.max(0, confidence));
  }
}

module.exports = AILearningPath;