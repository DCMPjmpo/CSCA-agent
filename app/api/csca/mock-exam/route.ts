/**
 * CSCA Mock Exam API
 * 完整模拟考试 - 对标正式考试标准
 * 
 * 科目配置：
 * - 基础汉语（综合）- 100题/120分钟
 * - 数学 - 60题/90分钟  
 * - 物理 - 50题/90分钟
 * - 化学 - 50题/90分钟
 * - 理科中文 - 80题/90分钟
 * - 文科中文 - 60题/90分钟
 */

import { NextResponse } from 'next/server';
import { getExamQuestions, getAllSubjects, getQuestionBankStats, Question } from '@/lib/csca/question-bank';
import { CSCA_SUBJECTS, getSubjectConfig } from '@/lib/csca/exam-config';
import { getAllScienceChineseQuestions, getScienceChineseQuestionsByModule } from '@/lib/csca/science-chinese-questions';
import { getAllArtsChineseQuestions, getArtsChineseQuestionsByModule } from '@/lib/csca/arts-chinese-questions';
import { auditQuestion, fixQuestion } from '@/lib/csca/question-auditor';

// CSCA Mock questions database (备用/补充)
const MOCK_QUESTIONS: Record<string, any[]> = {
  '基础汉语': [
    { id: 'chinese-mock-1', question: '下列词语中，书写完全正确的一项是：', options: ['A. 迫不急待', 'B. 再接再厉', 'C. 一愁莫展', 'D. 谈笑风声'], correctAnswer: 1, module: '汉语基础知识', difficulty: 'medium', subject: '基础汉语', answerExplanation: 'A项应为"迫不及待"；C项应为"一筹莫展"；D项应为"谈笑风生"。' },
    { id: 'chinese-mock-2', question: '选出下列句子中没有语病的一项：', options: ['A. 通过这次活动，使我们增长了见识。', 'B. 他不但会唱歌，而且会跳舞。', 'C. 我们要防止不发生类似事故。', 'D. 这种精神是值得我们学习的榜样。'], correctAnswer: 1, module: '语法运用', difficulty: 'medium', subject: '基础汉语', answerExplanation: 'A项缺主语，应删去"通过"或"使"；C项否定不当，应删去"不"；D项搭配不当，应删去"的榜样"。' },
    { id: 'chinese-mock-3', question: '"春风又绿江南岸"中"绿"字的词性是：', options: ['A. 名词', 'B. 动词', 'C. 形容词', 'D. 副词'], correctAnswer: 1, module: '词汇运用', difficulty: 'easy', subject: '基础汉语', answerExplanation: '"绿"在这里是使动用法，意为"使……变绿"，是动词。' },
    { id: 'chinese-mock-4', question: '下列哪个成语使用正确？', options: ['A. 他的演讲引起了大家的共鸣，全场鸦雀无声。', 'B. 春天来了，草木葱茏，万象更新。', 'C. 他学习刻苦，成绩一落千丈。', 'D. 这道数学题很简单，简直难以置信。'], correctAnswer: 1, module: '成语运用', difficulty: 'medium', subject: '基础汉语', answerExplanation: 'A项"鸦雀无声"与"引起共鸣"矛盾；C项"一落千丈"与"学习刻苦"矛盾；D项"难以置信"用词不当。' },
    { id: 'chinese-mock-5', question: '下列句子中，标点符号使用正确的是：', options: ['A. 他问："你今天有空吗"?', 'B. 我喜欢的水果有苹果、香蕉、橙子等。', 'C. 这本书的作者是鲁迅先生写的。', 'D. 公园里的花真多啊！有牡丹、玫瑰、菊花……等。'], correctAnswer: 1, module: '标点符号', difficulty: 'easy', subject: '基础汉语', answerExplanation: 'A项问号应在引号内；C项句式杂糅；D项省略号与"等"重复。' },
    { id: 'chinese-mock-6', question: '下列词语中，加点字读音完全正确的一项是：', options: ['A. 颓唐(tuí)、踌躇(chú)、蹒跚(pán)', 'B. 琐屑(xiāo)、差使(chāi)、交卸(xiè)', 'C. 狼藉(jí)、簌簌(sù)、颓唐(tuì)', 'D. 踌躇(zhù)、蹒跚(mán)、琐屑(xiè)'], correctAnswer: 0, module: '字音', difficulty: 'medium', subject: '基础汉语', answerExplanation: 'B项"屑"应读xiè；C项"颓"应读tuí；D项"躇"应读chú，"蹒"应读pán。' },
    { id: 'chinese-mock-7', question: '下列词语中，感情色彩与其他三项不同的是：', options: ['A. 坚强', 'B. 勇敢', 'C. 顽固', 'D. 聪明'], correctAnswer: 2, module: '词语感情色彩', difficulty: 'easy', subject: '基础汉语', answerExplanation: 'A、B、D都是褒义词，C是贬义词。' },
    { id: 'chinese-mock-8', question: '"他的话像一股暖流，温暖了我的心"这句话使用的修辞手法是：', options: ['A. 比喻', 'B. 拟人', 'C. 夸张', 'D. 排比'], correctAnswer: 0, module: '修辞手法', difficulty: 'easy', subject: '基础汉语', answerExplanation: '把"话"比作"暖流"，是比喻的修辞手法。' },
    { id: 'chinese-mock-9', question: '下列句子中，属于被动句的是：', options: ['A. 小明写完了作业。', 'B. 作业被小明写完了。', 'C. 小明把作业写完了。', 'D. 作业写完了。'], correctAnswer: 1, module: '句式', difficulty: 'easy', subject: '基础汉语', answerExplanation: 'B句用"被"字表示被动，是被动句。' },
    { id: 'chinese-mock-10', question: '"鲁迅是中国现代文学的奠基人"这句话的主语是：', options: ['A. 鲁迅', 'B. 中国', 'C. 文学', 'D. 奠基人'], correctAnswer: 0, module: '句子成分', difficulty: 'easy', subject: '基础汉语', answerExplanation: '句子的主语是"鲁迅"，表示动作的发出者。' },
  ],
  '数学': [
    { id: 'math-mock-1', question: '若集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B = ', options: ['A. {1, 2}', 'B. {2, 3}', 'C. {3, 4}', 'D. {1, 4}'], correctAnswer: 1, module: '集合', difficulty: 'easy', subject: '数学' },
    { id: 'math-mock-2', question: '函数 f(x) = x² - 4x + 3 的最小值是', options: ['A. -1', 'B. 0', 'C. 1', 'D. 3'], correctAnswer: 0, module: '函数', difficulty: 'medium', subject: '数学' },
    { id: 'math-mock-3', question: '等差数列 2, 5, 8, 11... 的第10项是', options: ['A. 26', 'B. 27', 'C. 29', 'D. 32'], correctAnswer: 2, module: '数列', difficulty: 'medium', subject: '数学' },
    { id: 'math-mock-4', question: '若 sin θ = 3/5，且 θ 为锐角，则 cos θ = ', options: ['A. 3/5', 'B. 4/5', 'C. 3/4', 'D. 4/3'], correctAnswer: 1, module: '三角函数', difficulty: 'medium', subject: '数学' },
    { id: 'math-mock-5', question: '直线 y = 2x + 1 与 x 轴的交点坐标是', options: ['A. (0, 1)', 'B. (1, 0)', 'C. (-1/2, 0)', 'D. (0, -1/2)'], correctAnswer: 2, module: '解析几何', difficulty: 'easy', subject: '数学' },
    { id: 'math-mock-6', question: 'log₂ 8 = ', options: ['A. 2', 'B. 3', 'C. 4', 'D. 8'], correctAnswer: 1, module: '对数', difficulty: 'easy', subject: '数学' },
    { id: 'math-mock-7', question: '若 x + y = 5，xy = 6，则 x² + y² = ', options: ['A. 11', 'B. 13', 'C. 25', 'D. 36'], correctAnswer: 1, module: '代数', difficulty: 'medium', subject: '数学' },
    { id: 'math-mock-8', question: '圆的方程 (x-1)² + (y+2)² = 9 的圆心坐标是', options: ['A. (1, 2)', 'B. (-1, 2)', 'C. (1, -2)', 'D. (-1, -2)'], correctAnswer: 2, module: '圆', difficulty: 'easy', subject: '数学' },
    { id: 'math-mock-9', question: 'lim(x→0) sin(x)/x = ', options: ['A. 0', 'B. 1', 'C. ∞', 'D. 不存在'], correctAnswer: 1, module: '极限', difficulty: 'medium', subject: '数学' },
    { id: 'math-mock-10', question: '函数 y = eˣ 的导数是', options: ['A. eˣ', 'B. xeˣ⁻¹', 'C. eˣ⁺¹', 'D. 1/eˣ'], correctAnswer: 0, module: '导数', difficulty: 'easy', subject: '数学' },
  ],
  '物理': [
    { id: 'physics-mock-1', question: '下列哪个是标量？', options: ['A. 速度', 'B. 加速度', 'C. 力', 'D. 质量'], correctAnswer: 3, module: '力学基础', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-2', question: '物体做匀速圆周运动时，其加速度方向', options: ['A. 沿切线方向', 'B. 指向圆心', 'C. 背离圆心', 'D. 为零'], correctAnswer: 1, module: '圆周运动', difficulty: 'medium', subject: '物理' },
    { id: 'physics-mock-3', question: '根据牛顿第三定律，作用力与反作用力', options: ['A. 大小相等，方向相同', 'B. 大小相等，方向相反', 'C. 大小不等，方向相反', 'D. 作用在同一物体上'], correctAnswer: 1, module: '牛顿定律', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-4', question: '理想气体状态方程是', options: ['A. PV = nRT', 'B. PV = RT', 'C. P = nRT/V', 'D. V = nRT/P'], correctAnswer: 0, module: '热学', difficulty: 'medium', subject: '物理' },
    { id: 'physics-mock-5', question: '简谐运动的位移公式为 x = A sin(ωt + φ)，其中 A 表示', options: ['A. 周期', 'B. 频率', 'C. 振幅', 'D. 初相位'], correctAnswer: 2, module: '振动', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-6', question: '光在真空中的传播速度约为', options: ['A. 3×10⁶ m/s', 'B. 3×10⁷ m/s', 'C. 3×10⁸ m/s', 'D. 3×10⁹ m/s'], correctAnswer: 2, module: '光学', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-7', question: '电阻 R = 10Ω，电流 I = 2A，则电压 U = ', options: ['A. 5V', 'B. 10V', 'C. 20V', 'D. 40V'], correctAnswer: 2, module: '电路', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-8', question: '动能的公式是', options: ['A. E = mgh', 'B. E = ½mv²', 'C. E = mc²', 'D. E = Pt'], correctAnswer: 1, module: '机械能', difficulty: 'easy', subject: '物理' },
    { id: 'physics-mock-9', question: '功率的公式是', options: ['A. P = W/t', 'B. P = Fv', 'C. P = UI', 'D. 以上都是'], correctAnswer: 3, module: '功和能', difficulty: 'medium', subject: '物理' },
    { id: 'physics-mock-10', question: '密度的公式是', options: ['A. ρ = m/V', 'B. ρ = V/m', 'C. ρ = mv', 'D. ρ = m+v'], correctAnswer: 0, module: '物质性质', difficulty: 'easy', subject: '物理' },
  ],
  '化学': [
    { id: 'chemistry-mock-1', question: '下列物质中，属于电解质的是', options: ['A. 蔗糖', 'B. 酒精', 'C. 氯化钠', 'D. 二氧化碳'], correctAnswer: 2, module: '电解质', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-2', question: '在周期表中，同一周期从左到右，原子半径', options: ['A. 逐渐增大', 'B. 逐渐减小', 'C. 先增大后减小', 'D. 保持不变'], correctAnswer: 1, module: '元素周期律', difficulty: 'medium', subject: '化学' },
    { id: 'chemistry-mock-3', question: '氧化还原反应的本质是', options: ['A. 氧原子的得失', 'B. 电子的转移', 'C. 化合价的改变', 'D. 新物质的生成'], correctAnswer: 1, module: '氧化还原', difficulty: 'medium', subject: '化学' },
    { id: 'chemistry-mock-4', question: '下列气体中，不能用浓硫酸干燥的是', options: ['A. H₂', 'B. O₂', 'C. NH₃', 'D. CO₂'], correctAnswer: 2, module: '气体干燥', difficulty: 'medium', subject: '化学' },
    { id: 'chemistry-mock-5', question: '苯的分子式是', options: ['A. C₆H₆', 'B. C₆H₁₂', 'C. C₅H₁₀', 'D. C₇H₈'], correctAnswer: 0, module: '有机化学', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-6', question: '水的化学式是', options: ['A. H₂O', 'B. CO₂', 'C. NaCl', 'D. HCl'], correctAnswer: 0, module: '化学式', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-7', question: 'NaOH 是', options: ['A. 酸', 'B. 碱', 'C. 盐', 'D. 氧化物'], correctAnswer: 1, module: '酸碱盐', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-8', question: '化学反应前后，质量守恒定律表明', options: ['A. 质量增加', 'B. 质量减少', 'C. 质量不变', 'D. 质量先增后减'], correctAnswer: 2, module: '质量守恒', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-9', question: '元素周期表中，原子序数等于', options: ['A. 质子数', 'B. 中子数', 'C. 电子数', 'D. 质量数'], correctAnswer: 0, module: '原子结构', difficulty: 'easy', subject: '化学' },
    { id: 'chemistry-mock-10', question: '盐酸的化学式是', options: ['A. H₂SO₄', 'B. HCl', 'C. HNO₃', 'D. NaOH'], correctAnswer: 1, module: '常见酸', difficulty: 'easy', subject: '化学' },
  ],
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
      // 清理题目内容
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
    // 特殊处理理科中文
    if (subject === '理科中文') {
      const config = getSubjectConfig('science-chinese');
      const subjectCount = config ? config.totalQuestions : 80;
      const questionsNeeded = Math.min(subjectCount, Math.ceil(questionCount / subjects.length));
      allQuestions = [...allQuestions, ...getScienceChineseExamQuestions(questionsNeeded)];
      return;
    }

    // 特殊处理文科中文
    if (subject === '文科中文') {
      const config = getSubjectConfig('arts-chinese');
      const subjectCount = config ? config.totalQuestions : 60;
      const questionsNeeded = Math.min(subjectCount, Math.ceil(questionCount / subjects.length));
      allQuestions = [...allQuestions, ...getArtsChineseExamQuestions(questionsNeeded)];
      return;
    }

    // 解析选项（处理选项可能是字符串的情况）
    function parseOptions(options: any[] | undefined): string[] {
      if (!options || options.length === 0) return [];

      // 如果只有一个选项且包含多个选项标记，尝试拆分
      if (options.length === 1 && typeof options[0] === 'string') {
        const text = options[0];
        // 尝试按 A. B. C. D. 拆分
        const matches = text.match(/([A-Da-d])\.\s*[^A-Da-d]+/g);
        if (matches && matches.length >= 2) {
          return matches.map(m => m.trim());
        }
        // 尝试按数字拆分
        const numMatches = text.match(/(\d+)\.\s*[^\d]+/g);
        if (numMatches && numMatches.length >= 2) {
          return numMatches.map(m => m.trim());
        }
      }

      // 正常情况：转换为字符串数组
      return options.map(opt => typeof opt === 'object' ? opt.value : String(opt)).filter(opt => opt.trim().length > 0);
    }

    // 其他科目从真实题库和Mock数据获取
    const realQuestions = getExamQuestions([subject], questionCount * 2); // 获取双倍数量用于过滤

    if (realQuestions.length > 0) {
      const formatted = realQuestions.map(q => {
        const parsedOptions = parseOptions(q.options);
        return ({
          id: q.id,
          question: q.question,
          options: parsedOptions,
          correctAnswer: q.answer ? (q.options || []).findIndex(opt =>
            typeof opt === 'object' ? opt.key === q.answer : String(opt).includes(q.answer)
          ) : -1,
          module: q.partTitle || q.type || q.module || '其他',
          difficulty: q.difficulty || 'medium',
          subject: q.subject,
          answerExplanation: '',
          type: q.type || '问答题'
        });
      });

      // 审核并过滤题目
      const { valid, invalid } = auditAndFilterQuestions(formatted);
      auditStats.total += formatted.length;
      auditStats.valid += valid.length;
      auditStats.invalid += invalid.length;

      // 如果有效题目不够，补充Mock数据
      const questionsNeeded = Math.min(Math.ceil(questionCount / subjects.length), valid.length);
      allQuestions = [...allQuestions, ...valid.slice(0, questionsNeeded)];

      // 如果有效题目不足，从Mock数据补充
      if (valid.length < questionsNeeded) {
        const mockQuestions = MOCK_QUESTIONS[subject] || MOCK_QUESTIONS['数学'];
        const needed = questionsNeeded - valid.length;
        allQuestions = [...allQuestions, ...mockQuestions.slice(0, needed)];
      }
    } else {
      // 使用Mock数据
      const mockQuestions = MOCK_QUESTIONS[subject] || MOCK_QUESTIONS['数学'];
      allQuestions = [...allQuestions, ...mockQuestions];
    }
  });

  // 打乱顺序并取指定数量
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const finalQuestions = shuffled.slice(0, questionCount);

  // 记录审核统计
  console.log(`题目审核完成 - 总数: ${auditStats.total}, 有效: ${auditStats.valid}, 无效: ${auditStats.invalid}`);

  return finalQuestions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjects = ['基础汉语', '数学', '物理', '理科中文'],
      questionCount = null,  // null表示使用正式考试标准
      mode = 'full'  // 'full'正式考试 / 'practice'练习模式
    } = body;

    // 如果没有指定题目数量，使用正式考试标准
    let targetCount = questionCount;
    if (!questionCount || questionCount <= 0) {
      if (mode === 'full') {
        // 正式考试模式：根据科目计算总题数
        targetCount = subjects.reduce((total, subject) => {
          const config = getSubjectConfig(subject) || getSubjectConfig('math');
          return total + (config?.totalQuestions || 50);
        }, 0);
      } else {
        // 练习模式：每科10题
        targetCount = subjects.length * 10;
      }
    }

    // 生成题目
    const questions = generateExamQuestions(subjects, targetCount);

    // 获取科目配置信息
    const examConfig = subjects.map(subject => {
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
