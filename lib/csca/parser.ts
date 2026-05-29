/**
 * CSCA 题目解析器
 * 从格式化文本中提取题目数据
 */

export interface ParsedQuestion {
  id: string;
  subject: string;           // 科目：语文、数学、英语、物理、化学
  track: string;            // 文科/理科/通用
  type: string;             // 题目类型：选择题、填空题、阅读理解等
  questionNumber: number;    // 题号
  question: string;          // 题目内容
  options?: {                // 选项（选择题才有）
    A: string;
    B: string;
    C?: string;
    D?: string;
  };
  answer?: string;          // 答案
  score?: number;           // 分值
  analysis?: string;        // 解析
  sourceFile: string;        // 来源文件
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: string[];
  stats: {
    totalQuestions: number;
    bySubject: Record<string, number>;
    byType: Record<string, number>;
  };
}

// 正则表达式匹配选择题
const CHOICE_PATTERN = /[（(]([A-D])[）)][^\n]*/g;
const CHOICE_LINE_PATTERN = /^([A-D])[．.、](.+)/gm;

// 正则表达式匹配题号
const QUESTION_NUM_PATTERN = /^(\d+)[、.、](.+)/gm;

// 提取选项
function extractOptions(text: string): { A?: string; B?: string; C?: string; D?: string } | null {
  const options: { A?: string; B?: string; C?: string; D?: string } = {};
  let match;
  
  // 匹配 A. 或 A、格式
  const lines = text.split('\n');
  for (const line of lines) {
    const lineMatch = line.match(/^([A-D])[．.、]\s*(.+)/);
    if (lineMatch) {
      options[lineMatch[1] as keyof typeof options] = lineMatch[2].trim();
    }
  }
  
  if (Object.keys(options).length >= 2) {
    return options;
  }
  return null;
}

// 判断是否为选择题
function isChoiceQuestion(text: string): boolean {
  return /[（(][A-D][）)]/.test(text) || /^[A-D][．.、]/.test(text);
}

// 判断是否为填空题
function isFillBlankQuestion(text: string): boolean {
  return /____*/.test(text) || /填空/.test(text);
}

// 解析文本内容
export function parseTextContent(content: string, sourceFile: string): ParseResult {
  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  // 确定科目
  let subject = '未知';
  if (sourceFile.includes('语文')) subject = '语文';
  else if (sourceFile.includes('数学')) subject = '数学';
  else if (sourceFile.includes('英语')) subject = '英语';
  else if (sourceFile.includes('物理')) subject = '物理';
  else if (sourceFile.includes('化学')) subject = '化学';
  
  // 确定文理科
  let track = '通用';
  if (sourceFile.includes('文科')) track = '文科';
  else if (sourceFile.includes('理科')) track = '理科';
  
  // 按行分割处理
  const lines = content.split('\n');
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: string[] = [];
  let questionNumber = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 跳过空行和目录行
    if (!line || line.startsWith('目 录') || line.startsWith('......')) continue;
    
    // 匹配题号开始新题
    const numMatch = line.match(/^(\d+)[、.．](.+)/);
    if (numMatch) {
      // 保存上一题
      if (currentQuestion && currentQuestion.question) {
        questions.push({
          id: `q_${subject}_${questionNumber.toString().padStart(3, '0')}`,
          subject,
          track,
          type: currentOptions.length > 0 ? '选择题' : '问答题',
          questionNumber,
          question: currentQuestion.question,
          options: currentOptions.length > 0 ? {
            A: currentOptions[0],
            B: currentOptions[1],
            C: currentOptions[2],
            D: currentOptions[3]
          } : undefined,
          answer: currentQuestion.answer,
          sourceFile,
          difficulty: currentQuestion.difficulty
        });
      }
      
      questionNumber = parseInt(numMatch[1]);
      currentQuestion = { question: numMatch[2] };
      currentOptions = [];
      continue;
    }
    
    // 匹配选项
    const optionMatch = line.match(/^([A-D])[．.、]\s*(.+)/);
    if (optionMatch && currentQuestion) {
      currentOptions.push(optionMatch[2]);
    }
    
    // 如果是选择题的续行（没有选项标记但内容是选项格式）
    if (currentQuestion && currentOptions.length > 0 && currentOptions.length < 4) {
      if (/^[A-D][．.、]/.test(line) === false && line.length > 0 && line.length < 200) {
        currentOptions.push(line);
      }
    }
    
    // 检测分值标记
    const scoreMatch = line.match(/[（(](\d+)\s*分[）)]/);
    if (scoreMatch && currentQuestion) {
      currentQuestion.difficulty = parseInt(scoreMatch[1]) <= 3 ? 'easy' : 
                                    parseInt(scoreMatch[1]) <= 6 ? 'medium' : 'hard';
    }
  }
  
  // 保存最后一题
  if (currentQuestion && currentQuestion.question) {
    questions.push({
      id: `q_${subject}_${questionNumber.toString().padStart(3, '0')}`,
      subject,
      track,
      type: currentOptions.length > 0 ? '选择题' : '问答题',
      questionNumber,
      question: currentQuestion.question,
      options: currentOptions.length > 0 ? {
        A: currentOptions[0],
        B: currentOptions[1],
        C: currentOptions[2],
        D: currentOptions[3]
      } : undefined,
      answer: currentQuestion.answer,
      sourceFile,
      difficulty: currentQuestion.difficulty
    });
  }
  
  // 统计
  const stats = {
    totalQuestions: questions.length,
    bySubject: { [subject]: questions.length },
    byType: questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
  
  return {
    success: errors.length === 0,
    questions,
    errors,
    stats
  };
}

// 从选择题目中提取答案
export function extractAnswerFromQuestion(questionText: string): string | undefined {
  // 匹配 "答案：X" 或 "正确答案：X" 格式
  const answerMatch = questionText.match(/答案[：:]\s*([A-D])/i);
  if (answerMatch) return answerMatch[1];
  
  // 匹配 "选X" 格式
  const chooseMatch = questionText.match(/选\s*([A-D])/);
  if (chooseMatch) return chooseMatch[1];
  
  return undefined;
}

// 导出为JSON格式
export function exportToJSON(questions: ParsedQuestion[], outputPath: string): string {
  return JSON.stringify(questions, null, 2);
}

// 导出为CSV格式
export function exportToCSV(questions: ParsedQuestion[]): string {
  const headers = ['ID', '科目', '文理科', '题型', '题号', '题目', '选项A', '选项B', '选项C', '选项D', '答案', '分值', '难度', '来源'];
  const rows = questions.map(q => [
    q.id,
    q.subject,
    q.track,
    q.type,
    q.questionNumber,
    q.question,
    q.options?.A || '',
    q.options?.B || '',
    q.options?.C || '',
    q.options?.D || '',
    q.answer || '',
    q.score?.toString() || '',
    q.difficulty || '',
    q.sourceFile
  ]);
  
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// 清理文本
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/　/g, ' ')
    .trim();
}

// 获取题目统计
export function getQuestionStats(questions: ParsedQuestion[]) {
  const bySubject: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byTrack: Record<string, number> = {};
  
  for (const q of questions) {
    bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
    byType[q.type] = (byType[q.type] || 0) + 1;
    byTrack[q.track] = (byTrack[q.track] || 0) + 1;
    if (q.difficulty) {
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    }
  }
  
  return {
    total: questions.length,
    bySubject,
    byType,
    byDifficulty,
    byTrack
  };
}
