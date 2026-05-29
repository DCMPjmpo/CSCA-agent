/**
 * CSCA题库批量解析脚本
 * 从cleaned_markdown文件夹中的TXT文件提取题目
 */

const fs = require('fs');
const path = require('path');

// 配置
const INPUT_DIR = './data/cleaned_markdown';
const OUTPUT_FILE = './data/processed/questions_from_txt.json';

// 科目映射
const SUBJECT_MAP = {
  '语文': ['语文', 'chinese', '中文'],
  '数学': ['数学', 'math', '算术'],
  '英语': ['英语', 'english', '英文'],
  '物理': ['物理', 'physics'],
  '化学': ['化学', 'chemistry'],
  '生物': ['生物', 'biology']
};

// 文理科映射
const TRACK_MAP = {
  '文科': ['文科', '文'],
  '理科': ['理科', '理'],
  '通用': ['通用', '文理']
};

// 解析单个文件
function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const questions = [];
  
  // 确定科目
  let subject = '未知';
  for (const [key, keywords] of Object.entries(SUBJECT_MAP)) {
    if (keywords.some(kw => fileName.includes(kw) || content.includes(kw))) {
      subject = key;
      break;
    }
  }
  
  // 确定文理科
  let track = '通用';
  for (const [key, keywords] of Object.entries(TRACK_MAP)) {
    if (keywords.some(kw => fileName.includes(kw) || content.includes(kw))) {
      track = key;
      break;
    }
  }
  
  // 分割内容
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentQuestion = null;
  let currentOptions = [];
  let inQuestion = false;
  let questionNumber = 0;
  let partTitle = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过目录和标题
    if (line.startsWith('目 录') || line.startsWith('......') || line.startsWith('===')) continue;
    
    // 检测部分标题
    const partMatch = line.match(/^[第]?[一二三四五六七八九十]+[部分章节]?[、.．](.+)/);
    if (partMatch) {
      partTitle = partMatch[1];
      continue;
    }
    
    // 检测题号开头的题目
    const questionMatch = line.match(/^(\d+)[、.．](.+)/);
    if (questionMatch) {
      // 保存上一题
      if (currentQuestion) {
        questions.push({
          ...currentQuestion,
          options: currentOptions.length > 0 ? currentOptions : undefined
        });
      }
      
      questionNumber = parseInt(questionMatch[1]);
      currentQuestion = {
        id: `q_${subject}_${track}_${questionNumber.toString().padStart(4, '0')}`,
        subject,
        track,
        questionNumber,
        question: questionMatch[2],
        type: '问答题',
        partTitle,
        sourceFile: fileName,
        lineNumber: i + 1
      };
      currentOptions = [];
      inQuestion = true;
      continue;
    }
    
    // 检测选项
    const optionMatch = line.match(/^([A-D])[、.．]\s*(.+)/);
    if (optionMatch && currentQuestion) {
      currentOptions.push({
        key: optionMatch[1],
        value: optionMatch[2]
      });
      currentQuestion.type = '选择题';
      continue;
    }
    
    // 如果在题目中，继续追加内容
    if (inQuestion && currentQuestion) {
      // 检测分值
      const scoreMatch = line.match(/[（(](\d+)\s*分[）)]/);
      if (scoreMatch) {
        currentQuestion.score = parseInt(scoreMatch[1]);
        currentQuestion.difficulty = currentQuestion.score <= 3 ? 'easy' : 
                                     currentQuestion.score <= 6 ? 'medium' : 'hard';
      }
      
      // 检测答案
      const answerMatch = line.match(/[答案正确答案]?[：:]\s*([A-D])/i);
      if (answerMatch) {
        currentQuestion.answer = answerMatch[1];
      }
      
      // 追加到题目内容（如果不是选项或答案）
      if (!optionMatch && !scoreMatch && !answerMatch && line.length > 0) {
        currentQuestion.question += '\n' + line;
      }
    }
  }
  
  // 保存最后一题
  if (currentQuestion) {
    questions.push({
      ...currentQuestion,
      options: currentOptions.length > 0 ? currentOptions : undefined
    });
  }
  
  return questions;
}

// 主函数
function main() {
  console.log('开始解析题库文件...');
  
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.txt'));
  console.log(`发现 ${files.length} 个TXT文件`);
  
  let allQuestions = [];
  
  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    try {
      const questions = parseFile(filePath);
      console.log(`解析 ${file}: ${questions.length} 道题目`);
      allQuestions = [...allQuestions, ...questions];
    } catch (error) {
      console.error(`解析 ${file} 失败: ${error.message}`);
    }
  }
  
  // 生成唯一ID
  allQuestions = allQuestions.map((q, index) => ({
    ...q,
    uniqueId: `csca_${Date.now()}_${index.toString().padStart(6, '0')}`
  }));
  
  // 统计
  const stats = {
    total: allQuestions.length,
    bySubject: {},
    byType: {},
    byTrack: {}
  };
  
  allQuestions.forEach(q => {
    stats.bySubject[q.subject] = (stats.bySubject[q.subject] || 0) + 1;
    stats.byType[q.type] = (stats.byType[q.type] || 0) + 1;
    stats.byTrack[q.track] = (stats.byTrack[q.track] || 0) + 1;
  });
  
  // 输出
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    metadata: {
      totalQuestions: allQuestions.length,
      filesProcessed: files.length,
      createdAt: new Date().toISOString(),
      stats
    },
    questions: allQuestions
  }, null, 2));
  
  console.log('\n解析完成！');
  console.log(`总题目数: ${stats.total}`);
  console.log('按科目分布:', JSON.stringify(stats.bySubject));
  console.log('按题型分布:', JSON.stringify(stats.byType));
  console.log('按文理科分布:', JSON.stringify(stats.byTrack));
  console.log(`输出文件: ${OUTPUT_FILE}`);
}

main();
