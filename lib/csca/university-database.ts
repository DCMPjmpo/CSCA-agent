export interface University {
  id: string;
  name: string;
  nameZh: string;
  type: 'top' | 'key' | 'regular' | 'backup';
  location: string;
  minScore: number;
  maxScore: number;
  hskRequirement: string;
  gpaRequirement: number;
  majors: string[];
  description: string;
}

export const UNIVERSITIES: University[] = [
  {
    id: 'pku',
    name: 'Peking University',
    nameZh: '北京大学',
    type: 'top',
    location: 'Beijing',
    minScore: 85,
    maxScore: 100,
    hskRequirement: 'HSK 5',
    gpaRequirement: 3.8,
    majors: ['Clinical Medicine', 'Computer Science', 'Economics', 'Law'],
    description: '中国顶尖综合性大学，在医学、理科、社科领域享有盛誉',
  },
  {
    id: 'tsinghua',
    name: 'Tsinghua University',
    nameZh: '清华大学',
    type: 'top',
    location: 'Beijing',
    minScore: 85,
    maxScore: 100,
    hskRequirement: 'HSK 5',
    gpaRequirement: 3.8,
    majors: ['Engineering', 'Computer Science', 'Medicine', 'Business'],
    description: '中国顶尖理工科大学，工程和计算机科学实力雄厚',
  },
  {
    id: 'fudan',
    name: 'Fudan University',
    nameZh: '复旦大学',
    type: 'top',
    location: 'Shanghai',
    minScore: 80,
    maxScore: 100,
    hskRequirement: 'HSK 5',
    gpaRequirement: 3.7,
    majors: ['Medicine', 'Economics', 'International Relations', 'Biology'],
    description: '华东地区顶尖大学，医学和社科专业突出',
  },
  {
    id: 'zhejiang',
    name: 'Zhejiang University',
    nameZh: '浙江大学',
    type: 'top',
    location: 'Hangzhou',
    minScore: 78,
    maxScore: 100,
    hskRequirement: 'HSK 5',
    gpaRequirement: 3.6,
    majors: ['Engineering', 'Medicine', 'Agriculture', 'Management'],
    description: '综合性研究型大学，学科门类齐全',
  },
  {
    id: 'sichuan',
    name: 'Sichuan University',
    nameZh: '四川大学',
    type: 'key',
    location: 'Chengdu',
    minScore: 70,
    maxScore: 95,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.4,
    majors: ['Medicine', 'Engineering', 'Liberal Arts', 'Science'],
    description: '西南地区重要综合性大学，口腔医学全国领先',
  },
  {
    id: 'sun-yat-sen',
    name: 'Sun Yat-sen University',
    nameZh: '中山大学',
    type: 'key',
    location: 'Guangzhou',
    minScore: 72,
    maxScore: 95,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.5,
    majors: ['Medicine', 'Business', 'Social Sciences', 'Engineering'],
    description: '华南地区著名学府，医学和商科实力强劲',
  },
  {
    id: 'wuhan',
    name: 'Wuhan University',
    nameZh: '武汉大学',
    type: 'key',
    location: 'Wuhan',
    minScore: 70,
    maxScore: 95,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.4,
    majors: ['Law', 'Medicine', 'Computer Science', 'Economics'],
    description: '中部地区重点高校，法学和计算机专业优秀',
  },
  {
    id: 'shandong',
    name: 'Shandong University',
    nameZh: '山东大学',
    type: 'key',
    location: 'Jinan',
    minScore: 65,
    maxScore: 90,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.3,
    majors: ['Medicine', 'Engineering', 'Science', 'Literature'],
    description: '山东省最高学府，综合性强，医学专业突出',
  },
  {
    id: 'nanjing-medical',
    name: 'Nanjing Medical University',
    nameZh: '南京医科大学',
    type: 'key',
    location: 'Nanjing',
    minScore: 68,
    maxScore: 92,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.3,
    majors: ['Clinical Medicine', 'Public Health', 'Pharmacy', 'Dentistry'],
    description: '著名医科大学，临床医学专业实力雄厚',
  },
  {
    id: 'capital-medical',
    name: 'Capital Medical University',
    nameZh: '首都医科大学',
    type: 'key',
    location: 'Beijing',
    minScore: 70,
    maxScore: 95,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.4,
    majors: ['Clinical Medicine', 'Neuroscience', 'Nursing', 'Stomatology'],
    description: '北京重要医科院校，附属医院众多',
  },
  {
    id: 'xiamen',
    name: 'Xiamen University',
    nameZh: '厦门大学',
    type: 'key',
    location: 'Xiamen',
    minScore: 68,
    maxScore: 92,
    hskRequirement: 'HSK 4',
    gpaRequirement: 3.4,
    majors: ['Economics', 'Business', 'Marine Science', 'Medicine'],
    description: '沿海地区知名高校，经济和海洋科学特色鲜明',
  },
  {
    id: 'jiangsu-univ',
    name: 'Jiangsu University',
    nameZh: '江苏大学',
    type: 'regular',
    location: 'Zhenjiang',
    minScore: 55,
    maxScore: 85,
    hskRequirement: 'HSK 3',
    gpaRequirement: 3.0,
    majors: ['Engineering', 'Medicine', 'Management', 'Agriculture'],
    description: '江苏省属重点高校，工科和医学实力较强',
  },
  {
    id: 'guangxi-medical',
    name: 'Guangxi Medical University',
    nameZh: '广西医科大学',
    type: 'regular',
    location: 'Nanning',
    minScore: 52,
    maxScore: 82,
    hskRequirement: 'HSK 3',
    gpaRequirement: 2.9,
    majors: ['Clinical Medicine', 'Preventive Medicine', 'Pharmacy'],
    description: '广西地区重要医科院校，面向东盟招生',
  },
  {
    id: 'yunnan-univ',
    name: 'Yunnan University',
    nameZh: '云南大学',
    type: 'regular',
    location: 'Kunming',
    minScore: 50,
    maxScore: 80,
    hskRequirement: 'HSK 3',
    gpaRequirement: 2.8,
    majors: ['Biology', 'Environmental Science', 'Medicine', 'Social Sciences'],
    description: '云南省属重点大学，生物和环境科学特色突出',
  },
  {
    id: 'guizhou-medical',
    name: 'Guizhou Medical University',
    nameZh: '贵州医科大学',
    type: 'regular',
    location: 'Guiyang',
    minScore: 48,
    maxScore: 78,
    hskRequirement: 'HSK 3',
    gpaRequirement: 2.8,
    majors: ['Clinical Medicine', 'Dentistry', 'Pharmacy', 'Nursing'],
    description: '贵州省重要医科院校，教学质量良好',
  },
  {
    id: 'liuzhou-medical',
    name: 'Liuzhou Medical College',
    nameZh: '柳州医学高等专科学校',
    type: 'backup',
    location: 'Liuzhou',
    minScore: 40,
    maxScore: 70,
    hskRequirement: 'HSK 2',
    gpaRequirement: 2.5,
    majors: ['Nursing', 'Medical Technology', 'Pharmacy', 'Public Health'],
    description: '广西地区医学院校，适合基础较弱的学生',
  },
  {
    id: 'baoshan-univ',
    name: 'Baoshan University',
    nameZh: '保山学院',
    type: 'backup',
    location: 'Baoshan',
    minScore: 35,
    maxScore: 65,
    hskRequirement: 'HSK 2',
    gpaRequirement: 2.4,
    majors: ['Basic Medicine', 'Biology', 'Chemistry', 'Education'],
    description: '云南省属普通本科院校，录取门槛较低',
  },
  {
    id: 'hechi-univ',
    name: 'Hechi University',
    nameZh: '河池学院',
    type: 'backup',
    location: 'Hechi',
    minScore: 35,
    maxScore: 65,
    hskRequirement: 'HSK 2',
    gpaRequirement: 2.4,
    majors: ['Biological Science', 'Chemistry', 'Education', 'Medicine'],
    description: '广西普通本科院校，适合成绩一般的学生',
  },
];

export function getUniversitiesByScore(score: number, major: string): University[] {
  const filtered = UNIVERSITIES.filter((u) => {
    const scoreMatch = score >= u.minScore && score <= u.maxScore;
    const majorMatch = u.majors.some((m) =>
      m.toLowerCase().includes(major.toLowerCase())
    );
    return scoreMatch && majorMatch;
  });

  return filtered.sort((a, b) => {
    const scoreDiffA = Math.abs(score - (a.minScore + a.maxScore) / 2);
    const scoreDiffB = Math.abs(score - (b.minScore + b.maxScore) / 2);
    return scoreDiffA - scoreDiffB;
  });
}

export function calculateMatchScore(score: number, university: University): number {
  const avgScore = (university.minScore + university.maxScore) / 2;
  const distance = Math.abs(score - avgScore);
  const maxDistance = (university.maxScore - university.minScore) / 2;
  
  let matchScore = 100 - (distance / maxDistance) * 50;
  
  if (score < university.minScore) {
    matchScore = Math.max(5, matchScore - 20);
  } else if (score > university.maxScore) {
    matchScore = Math.min(95, matchScore + 10);
  }
  
  return Math.round(Math.max(5, Math.min(95, matchScore)));
}
