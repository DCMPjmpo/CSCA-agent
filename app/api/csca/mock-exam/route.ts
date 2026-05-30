import { NextResponse } from 'next/server';
import { getExamQuestions, getAllSubjects, getQuestionBankStats, Question } from '@/lib/csca/question-bank';
import { CSCA_SUBJECTS, getSubjectConfig } from '@/lib/csca/exam-config';
import { getAllScienceChineseQuestions } from '@/lib/csca/science-chinese-questions';
import { getAllArtsChineseQuestions } from '@/lib/csca/arts-chinese-questions';
import { auditQuestion, fixQuestion } from '@/lib/csca/question-auditor';

// CSCA Mock questions database (备用/补充)
const MOCK_QUESTIONS: Record<string, any[]> = {
  '基础汉语': [
    { id: 'chinese-mock-1', question: '下列词语中，书写完全正确的一项是：', options: ['A. 迫不急待', 'B. 再接再厉', 'C. 一愁莫展', 'D. 谈笑风声'], correctAnswer: 1, module: '汉语基础知识', difficulty: 'medium', subject: '基础汉语', answerExplanation: 'A项应为"迫不及待"；C项应为"一筹莫展"；D项应为"谈笑风生"。' },
  ],
  '数学': [],
  '物理': [],
  '化学': [],
  '理科中文': [],
  '文科中文': [],
};

// 获取理科中文题目
function getScienceChineseExamQuestions(count: number): any[] {
  const allQuestions = getAllScienceChineseQuestions();
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map((q, index) => ({
    id: `science-chinese-${index}`,
    question: q.question,
    options: q.options.map((opt, i) => String.fromCharCode(65 + i) + '. ' + opt),
    correctAnswer: q.correctAnswer,
    module: q.module,
    difficulty: 'medium',
    subject: '理科中文',
    answerExplanation: q.explanation,
    englishTerm: q.englishTerm
  }));
}

// 获取文科中文题目
function getArtsChineseExamQuestions(count: number): any[] {
  const allQuestions = getAllArtsChineseQuestions();
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map((q, index) => ({
    id: `arts-chinese-${index}`,
    question: q.question,
    options: q.options.map((opt, i) => String.fromCharCode(65 + i) + '. ' + opt),
    correctAnswer: q.correctAnswer,
    module: q.module,
    difficulty: 'medium',
    subject: '文科中文',
    answerExplanation: q.explanation,
    englishTerm: q.englishTerm
  }));
}

// 审核并过滤题目
function auditAndFilterQuestions(questions: any[]): { valid: any[], invalid: any[] } {
  const valid: any[] = [];
  const invalid: any[] = [];
  questions.forEach(q => {
    const auditResult = auditQuestion(q as Question);
    if (auditResult.isValid) {
      const cleaned = fixQuestion(q as Question);
      valid.push({ ...q, question: cleaned.question, options: cleaned.options });
    } else {
      invalid.push({ ...q, auditIssues: auditResult.issues });
    }
  });
  return { valid, invalid };
}

// 获取指定科目和数量的题目
function generateExamQuestions(subjects: string[], questionCount: number): any[] {
  let allQuestions: any[] = [];
  let auditStats = { total: 0, valid: 0, invalid: 0 };

  subjects.forEach(subject => {
    if (subject === '理科中文') {
      const config = getSubjectConfig('science-chinese');
      const subjectCount = config ? config.totalQuestions : 80;
      const questionsNeeded = Math.min(subjectCount, Math.ceil(questionCount / subjects.length));
      allQuestions = [...allQuestions, ...getScienceChineseExamQuestions(questionsNeeded)];
      return;
    }
    if (subject === '文科中文') {
      const config = getSubjectConfig('arts-chinese');
      const subjectCount = config ? config.totalQuestions : 60;
      const questionsNeeded = Math.min(subjectCount, Math.ceil(questionCount / subjects.length));
      allQuestions = [...allQuestions, ...getArtsChineseExamQuestions(questionsNeeded)];
      return;
    }

    function parseOptions(options: any[] | undefined): string[] {
      if (!options || options.length === 0) return [];
      if (options.length === 1 && typeof options[0] === 'string') {
        const text = options[0];
        const matches = text.match(/([A-Da-d])\.\s*[^A-Da-d]+/g);
        if (matches && matches.length >= 2) return matches.map(m => m.trim());
      }
      return options.map(opt => typeof opt === 'object' ? opt.value : String(opt)).filter(opt => opt.trim().length > 0);
    }

    const realQuestions = getExamQuestions([subject], questionCount * 2);
    if (realQuestions.length > 0) {
      const formatted = realQuestions.map(q => {
        const parsedOptions = parseOptions(q.options);
        return ({
          id: q.id,
          question: q.question,
          options: parsedOptions,
          correctAnswer: q.answer ? (q.options || []).findIndex(opt =>
            typeof opt === 'object' ? opt.key === q.answer : String(opt).includes(q.answer || '')
          ) : -1,
          module: (q as any).partTitle || (q as any).type || '其他',
          difficulty: (q as any).difficulty || 'medium',
          subject: q.subject,
          answerExplanation: '',
          type: (q as any).type || '问答题'
        });
      });

      const { valid, invalid } = auditAndFilterQuestions(formatted);
      auditStats.total += formatted.length;
      auditStats.valid += valid.length;
      auditStats.invalid += invalid.length;

      const questionsNeeded = Math.min(Math.ceil(questionCount / subjects.length), valid.length);
      allQuestions = [...allQuestions, ...valid.slice(0, questionsNeeded)];

      if (valid.length < questionsNeeded) {
        const mockQuestions = MOCK_QUESTIONS[subject] || [];
        const needed = questionsNeeded - valid.length;
        allQuestions = [...allQuestions, ...(mockQuestions.slice(0, needed) || [])];
      }
    } else {
      const mockQuestions = MOCK_QUESTIONS[subject] || [];
      allQuestions = [...allQuestions, ...mockQuestions];
    }
  });

  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const finalQuestions = shuffled.slice(0, questionCount);
  console.log(`题目审核完成 - 总数: ${auditStats.total}, 有效: ${auditStats.valid}, 无效: ${auditStats.invalid}`);
  return finalQuestions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjects = ['基础汉语', '数学', '物理', '理科中文'],
      questionCount = null,
      mode = 'full'
    } = body;

    let targetCount = questionCount;
    if (!questionCount || questionCount <= 0) {
      if (mode === 'full') {
        // 所有参数都标注类型，彻底消灭隐式 any
        targetCount = subjects.reduce((total: number, subject: string) => {
          const config = getSubjectConfig(subject) || getSubjectConfig('math');
          return total + (config?.totalQuestions || 50);
        }, 0);
      } else {
        targetCount = subjects.length * 10;
      }
    }

    const questions = generateExamQuestions(subjects, targetCount);
    const examConfig = subjects.map((subject: string) => {
      const config = getSubjectConfig(subject);
      return {
        subject,
        duration: config?.duration || 90,
        totalQuestions: config?.totalQuestions || 50,
        totalScore: config?.totalScore || 100,
        sections: config?.sections || []
      };
    });

    return NextResponse.json({
      success: true,
      data: questions,
      step: 4,
      realBank: questions.some(q => q.subject !== '理科中文'),
      subjectCount: subjects.length,
      examConfig,
      totalQuestions: questions.length,
      stats: getQuestionBankStats(),
      message: mode === 'full' ? '已生成完整模拟考试' : '已生成练习题目'
    });

  } catch (error) {
    console.error('[CSCA Mock Exam API] Error:', error);
    return NextResponse.json({
      success: false,
      error: '生成题目失败',
      data: []
    });
  }
}

export async function GET() {
  try {
    const stats = getQuestionBankStats();
    const subjects = getAllSubjects();
    return NextResponse.json({
      success: true,
      stats,
      subjects: [...subjects, '理科中文', '文科中文'],
      examSubjects: CSCA_SUBJECTS,
      message: '题库加载成功'
    });
  } catch (error) {
    console.error('[CSCA Question Bank API] Error:', error);
    return NextResponse.json({
      success: false,
      message: '题库加载失败'
    });
  }
}