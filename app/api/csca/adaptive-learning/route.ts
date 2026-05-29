/**
 * CSCA Adaptive Learning API
 * Step 3: Generate adaptive exercises based on knowledge weaknesses
 * 
 * CSCA考试科目：
 * - 基础汉语（综合）- 听力、阅读、写作
 * - 数学 - 代数、几何、微积分基础
 * - 物理/化学 - 根据专业方向选择
 */

import { NextResponse } from 'next/server';

// Mock adaptive exercises for CSCA subjects
const MOCK_EXERCISES = [
  // 基础汉语练习题
  {
    id: 'ex-chi-1',
    question: '选择正确的读音："重"在"重要"中读作',
    options: ['chóng', 'zhòng', 'cóng', 'zòng'],
    answer: 1,
    difficulty: 0.3,
    topic: '语音',
    subject: '基础汉语',
  },
  {
    id: 'ex-chi-2',
    question: '"不入虎穴，焉得虎子"的意思是：',
    options: ['不进老虎洞，就抓不到小老虎', '不经历危险，就不能获得成功', '老虎很凶猛', '只有努力才能成功'],
    answer: 1,
    difficulty: 0.5,
    topic: '成语',
    subject: '基础汉语',
  },
  {
    id: 'ex-chi-3',
    question: '下列句子中没有语病的一项是：',
    options: ['通过这次活动，使我学到了很多知识', '他的写作水平明显改进了', '我们要认真改正并找出作业中的错误', '这本书的内容很丰富，值得一读'],
    answer: 3,
    difficulty: 0.6,
    topic: '语法',
    subject: '基础汉语',
  },
  // 数学练习题
  {
    id: 'ex-math-1',
    question: '若集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B = ',
    options: ['{1, 2}', '{2, 3}', '{3, 4}', '{1, 4}'],
    answer: 1,
    difficulty: 0.3,
    topic: '集合与函数',
    subject: '数学',
  },
  {
    id: 'ex-math-2',
    question: '函数 f(x) = x² - 4x + 3 的最小值是',
    options: ['-1', '0', '1', '3'],
    answer: 0,
    difficulty: 0.5,
    topic: '代数',
    subject: '数学',
  },
  {
    id: 'ex-math-3',
    question: '求极限：lim(x→0) (sin x)/x = ',
    options: ['0', '1', '∞', '不存在'],
    answer: 1,
    difficulty: 0.7,
    topic: '微积分基础',
    subject: '数学',
  },
  // 物理练习题
  {
    id: 'ex-phy-1',
    question: '下列哪个是标量？',
    options: ['速度', '加速度', '力', '质量'],
    answer: 3,
    difficulty: 0.3,
    topic: '力学基础',
    subject: '物理',
  },
  {
    id: 'ex-phy-2',
    question: '根据牛顿第三定律，作用力与反作用力',
    options: ['大小相等，方向相同', '大小相等，方向相反', '大小不等，方向相反', '作用在同一物体上'],
    answer: 1,
    difficulty: 0.4,
    topic: '力学基础',
    subject: '物理',
  },
  {
    id: 'ex-phy-3',
    question: '理想气体状态方程是',
    options: ['PV = nRT', 'PV = RT', 'P = nRT/V', 'V = nRT/P'],
    answer: 0,
    difficulty: 0.6,
    topic: '热学',
    subject: '物理',
  },
  // 化学练习题
  {
    id: 'ex-chem-1',
    question: '下列物质中，属于电解质的是',
    options: ['蔗糖', '酒精', '氯化钠', '二氧化碳'],
    answer: 2,
    difficulty: 0.3,
    topic: '化学基础',
    subject: '化学',
  },
  {
    id: 'ex-chem-2',
    question: '氧化还原反应的本质是',
    options: ['氧原子的得失', '电子的转移', '化合价的改变', '新物质的生成'],
    answer: 1,
    difficulty: 0.5,
    topic: '氧化还原',
    subject: '化学',
  },
  {
    id: 'ex-chem-3',
    question: '在标准状况下，1 mol 任何气体的体积约为',
    options: ['11.2 L', '22.4 L', '44.8 L', '取决于气体种类'],
    answer: 1,
    difficulty: 0.4,
    topic: '化学计量',
    subject: '化学',
  },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topics = [], mastery = {}, subjects = ['基础汉语', '数学'] } = body;

    // Filter exercises by subjects
    let filteredExercises = MOCK_EXERCISES.filter(ex => subjects.includes(ex.subject));
    
    // If no exercises match, use all
    if (filteredExercises.length === 0) {
      filteredExercises = MOCK_EXERCISES;
    }

    // Generate exercises based on mastery levels (lower mastery = harder questions)
    const adaptiveExercises = filteredExercises.map((ex, idx) => {
      // Adjust difficulty based on topic mastery
      const topicMastery = mastery[ex.topic] || 0.5;
      const adjustedDifficulty = Math.min(0.9, Math.max(0.2, ex.difficulty + (0.5 - topicMastery) * 0.3));
      
      return {
        ...ex,
        id: `adapt-${idx}-${Date.now()}`,
        difficulty: Math.round(adjustedDifficulty * 10) / 10,
      };
    });

    return NextResponse.json({
      success: true,
      data: adaptiveExercises,
      step: 3,
      mock: true,
    });

  } catch (error) {
    console.error('[CSCA Adaptive Learning API] Error:', error);
    return NextResponse.json({
      success: true,
      data: MOCK_EXERCISES.filter(ex => ['基础汉语', '数学'].includes(ex.subject)),
      step: 3,
      mock: true,
    });
  }
}
