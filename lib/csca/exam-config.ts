/**
 * CSCA Exam Configuration
 * 正式考试配置标准
 */

export interface ExamConfig {
  id: string;
  name: string;
  duration: number; // 分钟
  totalQuestions: number;
  totalScore: number;
  sections: SectionConfig[];
}

export interface SectionConfig {
  id: string;
  name: string;
  questions: number;
  score: number;
  modules: string[];
}

export interface SubjectConfig {
  id: string;
  name: string;
  nameEn: string;
  duration: number;
  totalQuestions: number;
  totalScore: number;
  sections: SectionConfig[];
}

// CSCA正式考试科目配置
export const CSCA_SUBJECTS: SubjectConfig[] = [
  {
    id: 'chinese',
    name: '基础汉语（综合）',
    nameEn: 'Basic Chinese',
    duration: 120,
    totalQuestions: 100,
    totalScore: 100,
    sections: [
      { id: 'listening', name: '听力理解', questions: 30, score: 30, modules: ['听力理解', '对话理解', '短文听力'] },
      { id: 'reading', name: '阅读理解', questions: 40, score: 40, modules: ['短文阅读', '长文阅读', '快速阅读'] },
      { id: 'writing', name: '书面表达', questions: 30, score: 30, modules: ['应用文写作', '议论文写作', '翻译'] }
    ]
  },
  {
    id: 'math',
    name: '数学',
    nameEn: 'Mathematics',
    duration: 90,
    totalQuestions: 60,
    totalScore: 100,
    sections: [
      { id: 'algebra', name: '代数与方程', questions: 20, score: 30, modules: ['集合与逻辑', '函数', '方程与不等式'] },
      { id: 'geometry', name: '几何', questions: 20, score: 30, modules: ['平面几何', '立体几何', '解析几何'] },
      { id: 'calculus', name: '微积分基础', questions: 20, score: 40, modules: ['极限', '导数', '积分'] }
    ]
  },
  {
    id: 'physics',
    name: '物理',
    nameEn: 'Physics',
    duration: 90,
    totalQuestions: 50,
    totalScore: 100,
    sections: [
      { id: 'mechanics', name: '力学', questions: 15, score: 30, modules: ['运动学', '牛顿定律', '动量与能量'] },
      { id: 'electromagnetism', name: '电磁学', questions: 15, score: 30, modules: ['电场', '磁场', '电路'] },
      { id: 'thermodynamics', name: '热学与光学', questions: 20, score: 40, modules: ['热传递', '光学', '波动'] }
    ]
  },
  {
    id: 'chemistry',
    name: '化学',
    nameEn: 'Chemistry',
    duration: 90,
    totalQuestions: 50,
    totalScore: 100,
    sections: [
      { id: 'inorganic', name: '无机化学', questions: 15, score: 30, modules: ['元素周期律', '化学键', '化学反应'] },
      { id: 'organic', name: '有机化学', questions: 15, score: 30, modules: ['烃类', '官能团', '有机反应'] },
      { id: 'experiment', name: '化学实验', questions: 20, score: 40, modules: ['实验操作', '数据分析', '化学计算'] }
    ]
  },
  {
    id: 'science-chinese',
    name: '理科中文',
    nameEn: 'Science Chinese',
    duration: 90,
    totalQuestions: 80,
    totalScore: 100,
    sections: [
      { id: 'math-symbols', name: '数学符号与表达式', questions: 20, score: 25, modules: ['集合符号', '函数表示', '几何术语', '概率统计'] },
      { id: 'physics-concepts', name: '物理概念与定律', questions: 20, score: 25, modules: ['力学', '电磁学', '热力学', '光学'] },
      { id: 'chemistry-equations', name: '化学方程式与实验', questions: 20, score: 25, modules: ['化学键', '反应类型', '实验操作', '有机化学'] },
      { id: 'data-analysis', name: '数据图表与科学推理', questions: 20, score: 25, modules: ['图表解读', '实验数据分析', '科学推理'] }
    ]
  },
  {
    id: 'arts-chinese',
    name: '文科中文',
    nameEn: 'Arts Chinese',
    duration: 90,
    totalQuestions: 60,
    totalScore: 100,
    sections: [
      { id: 'literature', name: '文学鉴赏', questions: 20, score: 35, modules: ['古诗词', '现代文学', '文学常识'] },
      { id: 'history', name: '历史文化', questions: 20, score: 30, modules: ['中国历史', '世界历史', '文化常识'] },
      { id: 'essay', name: '论述写作', questions: 20, score: 35, modules: ['议论文', '应用文', '材料分析'] }
    ]
  }
];

// 获取科目配置
export function getSubjectConfig(subjectId: string): SubjectConfig | undefined {
  return CSCA_SUBJECTS.find(s => s.id === subjectId || s.name === subjectId);
}

// 获取所有科目ID
export function getAllSubjectIds(): string[] {
  return CSCA_SUBJECTS.map(s => s.id);
}

// 获取所有科目名称
export function getAllSubjectNames(): string[] {
  return CSCA_SUBJECTS.map(s => s.name);
}

// 获取完整考试配置（理科方向）
export function getScienceExamConfig(): ExamConfig {
  return {
    id: 'science-exam',
    name: 'CSCA理科方向完整模拟',
    duration: 480, // 8小时
    totalQuestions: 380,
    totalScore: 500,
    sections: [
      ...CSCA_SUBJECTS.find(s => s.id === 'chinese')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'math')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'physics')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'science-chinese')!.sections
    ]
  };
}

// 获取完整考试配置（文科方向）
export function getArtsExamConfig(): ExamConfig {
  return {
    id: 'arts-exam',
    name: 'CSCA文科方向完整模拟',
    duration: 450, // 7.5小时
    totalQuestions: 300,
    totalScore: 500,
    sections: [
      ...CSCA_SUBJECTS.find(s => s.id === 'chinese')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'math')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'chemistry')!.sections,
      ...CSCA_SUBJECTS.find(s => s.id === 'arts-chinese')!.sections
    ]
  };
}
