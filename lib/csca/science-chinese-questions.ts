/**
 * 理科中文专项题库
 * 专为东盟考生设计，解决"看不懂题"的痛点
 */

export interface ScienceChineseQuestion {
  id: string;
  module: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  englishTerm?: string;
}

// 模块一：数学符号与表达式 (20题)
export const mathSymbolQuestions: ScienceChineseQuestion[] = [
  {
    id: 'math-sym-1',
    module: '集合符号',
    question: '集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B =',
    options: ['{1, 2}', '{2, 3}', '{3, 4}', '{1, 4}'],
    correctAnswer: 1,
    explanation: '∩ 表示交集，即两个集合共有的元素。A和B都有2和3，所以答案是{2, 3}。',
    englishTerm: 'intersection'
  },
  {
    id: 'math-sym-2',
    module: '集合符号',
    question: '空集的表示符号是',
    options: ['∪', '∩', '∅', '∈'],
    correctAnswer: 2,
    explanation: '∅ 表示空集，即不包含任何元素的集合。',
    englishTerm: 'empty set'
  },
  {
    id: 'math-sym-3',
    module: '集合符号',
    question: '如果集合 A 的所有元素都在集合 B 中，我们可以表示为',
    options: ['A ∈ B', 'A ⊆ B', 'A ∪ B', 'A = B'],
    correctAnswer: 1,
    explanation: '⊆ 表示子集关系，即A是B的子集。',
    englishTerm: 'subset'
  },
  {
    id: 'math-sym-4',
    module: '函数表示',
    question: 'f(x) = x² 中，f(x) 表示',
    options: ['x的平方', '函数f在x处的值', 'f乘以x', 'x的f次方'],
    correctAnswer: 1,
    explanation: 'f(x) 表示函数f在点x处的函数值。',
    englishTerm: 'function value'
  },
  {
    id: 'math-sym-5',
    module: '函数表示',
    question: '函数 y = f(x) 的"定义域"是指',
    options: ['y的取值范围', 'x的取值范围', '函数图像', '函数的最大值'],
    correctAnswer: 1,
    explanation: '定义域是指自变量x可以取的值的范围。',
    englishTerm: 'domain'
  },
  {
    id: 'math-sym-6',
    module: '函数表示',
    question: '函数 y = f(x) 的"值域"是指',
    options: ['x的取值范围', 'y的取值范围', '函数的周期', '函数的最小值'],
    correctAnswer: 1,
    explanation: '值域是指函数值y可以取的值的范围。',
    englishTerm: 'range'
  },
  {
    id: 'math-sym-7',
    module: '几何术语',
    question: '两条直线永远不相交且距离相等，我们称这两条直线',
    options: ['垂直', '平行', '相交', '重合'],
    correctAnswer: 1,
    explanation: '平行的两条直线永不相交且距离相等。',
    englishTerm: 'parallel'
  },
  {
    id: 'math-sym-8',
    module: '几何术语',
    question: '两条直线相交成90度角，我们称这两条直线',
    options: ['平行', '垂直', '重合', '异面'],
    correctAnswer: 1,
    explanation: '垂直的两条直线相交成直角（90度）。',
    englishTerm: 'perpendicular'
  },
  {
    id: 'math-sym-9',
    module: '几何术语',
    question: '两个三角形形状相同但大小不同，我们称这两个三角形',
    options: ['全等', '相似', '相等', '对称'],
    correctAnswer: 1,
    explanation: '相似三角形形状相同但大小可以不同。',
    englishTerm: 'similar'
  },
  {
    id: 'math-sym-10',
    module: '几何术语',
    question: '两个三角形形状和大小都相同，我们称这两个三角形',
    options: ['相似', '全等', '对称', '平行'],
    correctAnswer: 1,
    explanation: '全等三角形形状和大小都完全相同。',
    englishTerm: 'congruent'
  },
  {
    id: 'math-sym-11',
    module: '概率统计',
    question: '在统计学中，"样本"是指',
    options: ['研究的全部对象', '从总体中抽取的一部分', '数据的平均值', '数据的最大值'],
    correctAnswer: 1,
    explanation: '样本是从总体中抽取出来进行研究的一部分个体。',
    englishTerm: 'sample'
  },
  {
    id: 'math-sym-12',
    module: '概率统计',
    question: '在统计学中，"总体"是指',
    options: ['研究的全部对象', '从总体中抽取的一部分', '数据的中位数', '数据的方差'],
    correctAnswer: 0,
    explanation: '总体是指研究对象的全体。',
    englishTerm: 'population'
  },
  {
    id: 'math-sym-13',
    module: '概率统计',
    question: '"频率"是指',
    options: ['事件发生的次数', '事件发生的次数与总次数的比值', '事件发生的可能性', '事件的重要性'],
    correctAnswer: 1,
    explanation: '频率是指某个事件发生的次数与总试验次数的比值。',
    englishTerm: 'frequency'
  },
  {
    id: 'math-sym-14',
    module: '概率统计',
    question: '"方差"是用来衡量',
    options: ['数据的平均值', '数据的离散程度', '数据的最大值', '数据的总和'],
    correctAnswer: 1,
    explanation: '方差用来衡量数据与其平均值之间的离散程度。',
    englishTerm: 'variance'
  },
  {
    id: 'math-sym-15',
    module: '数学符号',
    question: '符号 ∑ 表示',
    options: ['求积', '求和', '求差', '求商'],
    correctAnswer: 1,
    explanation: '∑ 是求和符号，表示将一系列数值相加。',
    englishTerm: 'summation'
  },
  {
    id: 'math-sym-16',
    module: '数学符号',
    question: '符号 π 表示',
    options: ['圆周率', '自然常数', '黄金比例', '虚数单位'],
    correctAnswer: 0,
    explanation: 'π 是圆周率，约等于3.14159。',
    englishTerm: 'pi'
  },
  {
    id: 'math-sym-17',
    module: '数学符号',
    question: '符号 √ 表示',
    options: ['平方', '立方', '平方根', '绝对值'],
    correctAnswer: 2,
    explanation: '√ 是平方根符号，表示求一个数的平方根。',
    englishTerm: 'square root'
  },
  {
    id: 'math-sym-18',
    module: '数学符号',
    question: '符号 |x| 表示',
    options: ['x的平方', 'x的绝对值', 'x的倒数', 'x的相反数'],
    correctAnswer: 1,
    explanation: '|x| 表示x的绝对值，即x到原点的距离。',
    englishTerm: 'absolute value'
  },
  {
    id: 'math-sym-19',
    module: '数学符号',
    question: '符号 ∞ 表示',
    options: ['零', '无穷大', '有限', '未知数'],
    correctAnswer: 1,
    explanation: '∞ 表示无穷大，即一个无限大的数。',
    englishTerm: 'infinity'
  },
  {
    id: 'math-sym-20',
    module: '数学符号',
    question: '符号 ∫ 表示',
    options: ['求导', '积分', '极限', '微分'],
    correctAnswer: 1,
    explanation: '∫ 是积分符号，表示求函数的积分。',
    englishTerm: 'integral'
  }
];

// 模块二：物理概念与定律 (20题)
export const physicsConceptQuestions: ScienceChineseQuestion[] = [
  {
    id: 'physics-1',
    module: '力学',
    question: '牛顿第一定律又称为',
    options: ['加速度定律', '惯性定律', '作用力定律', '万有引力定律'],
    correctAnswer: 1,
    explanation: '牛顿第一定律也叫惯性定律，指出物体在不受外力时保持静止或匀速直线运动。',
    englishTerm: 'Law of Inertia'
  },
  {
    id: 'physics-2',
    module: '力学',
    question: 'F = ma 是哪个定律的数学表达式？',
    options: ['牛顿第一定律', '牛顿第二定律', '牛顿第三定律', '胡克定律'],
    correctAnswer: 1,
    explanation: 'F = ma 是牛顿第二定律，表示力等于质量乘以加速度。',
    englishTerm: 'Newton\'s Second Law'
  },
  {
    id: 'physics-3',
    module: '力学',
    question: '"作用力与反作用力大小相等、方向相反"描述的是',
    options: ['牛顿第一定律', '牛顿第二定律', '牛顿第三定律', '万有引力定律'],
    correctAnswer: 2,
    explanation: '牛顿第三定律指出作用力和反作用力总是成对出现，大小相等、方向相反。',
    englishTerm: 'Newton\'s Third Law'
  },
  {
    id: 'physics-4',
    module: '力学',
    question: '"动量守恒"是指',
    options: ['物体的动量永远不变', '系统总动量在不受外力时保持不变', '动量随时间增加', '动量随时间减少'],
    correctAnswer: 1,
    explanation: '动量守恒定律指出，在没有外力作用的情况下，系统的总动量保持不变。',
    englishTerm: 'Conservation of Momentum'
  },
  {
    id: 'physics-5',
    module: '力学',
    question: '"功"的定义是',
    options: ['力乘以时间', '力乘以距离', '质量乘以加速度', '速度乘以时间'],
    correctAnswer: 1,
    explanation: '功等于力乘以物体在力的方向上移动的距离，W = F × s。',
    englishTerm: 'Work'
  },
  {
    id: 'physics-6',
    module: '电磁学',
    question: '"电场"是指',
    options: ['电荷周围的空间区域', '电流流动的路径', '磁铁周围的区域', '电子的运动轨迹'],
    correctAnswer: 0,
    explanation: '电场是指电荷周围存在的一种特殊物质，对放入其中的电荷有力的作用。',
    englishTerm: 'Electric Field'
  },
  {
    id: 'physics-7',
    module: '电磁学',
    question: '"磁场"是指',
    options: ['电流周围的空间区域', '电荷周围的区域', '电池内部的区域', '电阻周围的区域'],
    correctAnswer: 0,
    explanation: '磁场是指磁体或电流周围存在的一种特殊物质，对放入其中的磁体有力的作用。',
    englishTerm: 'Magnetic Field'
  },
  {
    id: 'physics-8',
    module: '电磁学',
    question: '欧姆定律的数学表达式是',
    options: ['U = IR', 'P = UI', 'W = Pt', 'Q = It'],
    correctAnswer: 0,
    explanation: '欧姆定律表示电压等于电流乘以电阻，U = IR。',
    englishTerm: 'Ohm\'s Law'
  },
  {
    id: 'physics-9',
    module: '电磁学',
    question: '"电阻"的单位是',
    options: ['伏特', '安培', '欧姆', '瓦特'],
    correctAnswer: 2,
    explanation: '电阻的单位是欧姆，用符号Ω表示。',
    englishTerm: 'Ohm'
  },
  {
    id: 'physics-10',
    module: '电磁学',
    question: '"电压"的单位是',
    options: ['安培', '伏特', '欧姆', '瓦特'],
    correctAnswer: 1,
    explanation: '电压的单位是伏特，用符号V表示。',
    englishTerm: 'Volt'
  },
  {
    id: 'physics-11',
    module: '热力学',
    question: '"热传递"的三种方式是',
    options: ['传导、对流、辐射', '蒸发、冷凝、升华', '熔化、凝固、汽化', '吸热、放热、绝热'],
    correctAnswer: 0,
    explanation: '热传递有三种方式：传导（通过物体接触）、对流（通过流体流动）、辐射（通过电磁波）。',
    englishTerm: 'Heat Transfer'
  },
  {
    id: 'physics-12',
    module: '热力学',
    question: '"内能"是指',
    options: ['物体的动能', '物体内部所有分子的动能和势能之和', '物体的势能', '物体的机械能'],
    correctAnswer: 1,
    explanation: '内能是物体内部所有分子热运动的动能和分子间势能的总和。',
    englishTerm: 'Internal Energy'
  },
  {
    id: 'physics-13',
    module: '热力学',
    question: '"熵"是用来衡量',
    options: ['物体的温度', '系统的无序程度', '物体的热量', '物体的体积'],
    correctAnswer: 1,
    explanation: '熵是衡量系统无序程度的物理量，熵越大表示系统越无序。',
    englishTerm: 'Entropy'
  },
  {
    id: 'physics-14',
    module: '光学',
    question: '"折射"是指',
    options: ['光在同一介质中传播', '光从一种介质进入另一种介质时改变方向', '光被物体反射', '光被物体吸收'],
    correctAnswer: 1,
    explanation: '折射是指光从一种介质进入另一种介质时，传播方向发生改变的现象。',
    englishTerm: 'Refraction'
  },
  {
    id: 'physics-15',
    module: '光学',
    question: '"反射"是指',
    options: ['光穿过物体', '光遇到物体表面后返回原介质', '光被物体吸收', '光改变颜色'],
    correctAnswer: 1,
    explanation: '反射是指光遇到物体表面后，返回原介质继续传播的现象。',
    englishTerm: 'Reflection'
  },
  {
    id: 'physics-16',
    module: '光学',
    question: '"波长"是指',
    options: ['光的颜色', '相邻两个波峰或波谷之间的距离', '光的速度', '光的频率'],
    correctAnswer: 1,
    explanation: '波长是指波在一个振动周期内传播的距离，即相邻两个波峰或波谷之间的距离。',
    englishTerm: 'Wavelength'
  },
  {
    id: 'physics-17',
    module: '力学',
    question: '"加速度"是指',
    options: ['物体运动的速度', '物体速度的变化率', '物体运动的距离', '物体运动的时间'],
    correctAnswer: 1,
    explanation: '加速度是速度的变化率，即单位时间内速度的变化量。',
    englishTerm: 'Acceleration'
  },
  {
    id: 'physics-18',
    module: '力学',
    question: '"匀速直线运动"是指',
    options: ['速度不断增加的运动', '速度保持不变的直线运动', '速度不断减小的运动', '方向不断改变的运动'],
    correctAnswer: 1,
    explanation: '匀速直线运动是指物体沿着直线运动，且速度保持不变。',
    englishTerm: 'Uniform Linear Motion'
  },
  {
    id: 'physics-19',
    module: '电磁学',
    question: '"电流"的单位是',
    options: ['伏特', '安培', '欧姆', '瓦特'],
    correctAnswer: 1,
    explanation: '电流的单位是安培，用符号A表示。',
    englishTerm: 'Ampere'
  },
  {
    id: 'physics-20',
    module: '电磁学',
    question: '"电功率"的单位是',
    options: ['伏特', '安培', '欧姆', '瓦特'],
    correctAnswer: 3,
    explanation: '电功率的单位是瓦特，用符号W表示。',
    englishTerm: 'Watt'
  }
];

// 模块三：化学方程式与实验 (20题)
export const chemistryQuestions: ScienceChineseQuestion[] = [
  {
    id: 'chem-1',
    module: '化学键',
    question: '"离子键"是指',
    options: ['两个非金属原子之间的结合', '金属原子和非金属原子之间通过电子转移形成的结合', '原子之间通过共用电子对形成的结合', '分子之间的作用力'],
    correctAnswer: 1,
    explanation: '离子键是金属原子和非金属原子之间通过电子转移形成的化学键。',
    englishTerm: 'Ionic Bond'
  },
  {
    id: 'chem-2',
    module: '化学键',
    question: '"共价键"是指',
    options: ['金属原子之间的结合', '原子之间通过共用电子对形成的结合', '离子之间的静电作用', '分子之间的作用力'],
    correctAnswer: 1,
    explanation: '共价键是原子之间通过共用电子对形成的化学键。',
    englishTerm: 'Covalent Bond'
  },
  {
    id: 'chem-3',
    module: '化学键',
    question: '"金属键"是指',
    options: ['金属原子之间通过自由电子形成的结合', '非金属原子之间的结合', '离子之间的结合', '分子之间的作用力'],
    correctAnswer: 0,
    explanation: '金属键是金属晶体中金属阳离子与自由电子之间的相互作用。',
    englishTerm: 'Metallic Bond'
  },
  {
    id: 'chem-4',
    module: '反应类型',
    question: '"化合反应"是指',
    options: ['一种物质分解成多种物质', '多种物质反应生成一种物质', '一种单质和一种化合物反应生成另一种单质和化合物', '两种化合物互相交换成分'],
    correctAnswer: 1,
    explanation: '化合反应是指两种或两种以上的物质反应生成一种新物质的反应。',
    englishTerm: 'Combination Reaction'
  },
  {
    id: 'chem-5',
    module: '反应类型',
    question: '"分解反应"是指',
    options: ['多种物质反应生成一种物质', '一种物质分解成多种物质', '单质和化合物反应', '两种化合物交换成分'],
    correctAnswer: 1,
    explanation: '分解反应是指一种物质分解成两种或两种以上新物质的反应。',
    englishTerm: 'Decomposition Reaction'
  },
  {
    id: 'chem-6',
    module: '反应类型',
    question: '"置换反应"是指',
    options: ['两种化合物交换成分', '一种单质和一种化合物反应生成另一种单质和化合物', '多种物质生成一种物质', '一种物质分解成多种物质'],
    correctAnswer: 1,
    explanation: '置换反应是指一种单质和一种化合物反应，生成另一种单质和另一种化合物的反应。',
    englishTerm: 'Displacement Reaction'
  },
  {
    id: 'chem-7',
    module: '反应类型',
    question: '"复分解反应"是指',
    options: ['单质和化合物反应', '两种化合物互相交换成分生成两种新化合物', '一种物质分解', '多种物质合成'],
    correctAnswer: 1,
    explanation: '复分解反应是指两种化合物互相交换成分，生成另外两种化合物的反应。',
    englishTerm: 'Double Displacement Reaction'
  },
  {
    id: 'chem-8',
    module: '实验操作',
    question: '"过滤"是用来分离',
    options: ['可溶性固体和液体', '不溶性固体和液体', '两种互溶的液体', '两种不互溶的液体'],
    correctAnswer: 1,
    explanation: '过滤是用来分离不溶性固体和液体的方法。',
    englishTerm: 'Filtration'
  },
  {
    id: 'chem-9',
    module: '实验操作',
    question: '"蒸馏"是用来分离',
    options: ['不溶性固体和液体', '两种沸点不同的互溶液体', '两种不互溶的液体', '可溶性固体和液体'],
    correctAnswer: 1,
    explanation: '蒸馏是利用液体沸点不同来分离互溶液体混合物的方法。',
    englishTerm: 'Distillation'
  },
  {
    id: 'chem-10',
    module: '实验操作',
    question: '"滴定"是用来',
    options: ['分离混合物', '测定溶液浓度', '加热物质', '溶解固体'],
    correctAnswer: 1,
    explanation: '滴定是一种定量分析方法，用来测定溶液的浓度。',
    englishTerm: 'Titration'
  },
  {
    id: 'chem-11',
    module: '有机化学',
    question: '"烷烃"的通式是',
    options: ['CnH2n', 'CnH2n+2', 'CnH2n-2', 'CnHn'],
    correctAnswer: 1,
    explanation: '烷烃是饱和烃，通式为CnH2n+2。',
    englishTerm: 'Alkane'
  },
  {
    id: 'chem-12',
    module: '有机化学',
    question: '"烯烃"的通式是',
    options: ['CnH2n+2', 'CnH2n', 'CnH2n-2', 'CnHn'],
    correctAnswer: 1,
    explanation: '烯烃含有一个碳碳双键，通式为CnH2n。',
    englishTerm: 'Alkene'
  },
  {
    id: 'chem-13',
    module: '有机化学',
    question: '"炔烃"的通式是',
    options: ['CnH2n+2', 'CnH2n', 'CnH2n-2', 'CnHn'],
    correctAnswer: 2,
    explanation: '炔烃含有一个碳碳三键，通式为CnH2n-2。',
    englishTerm: 'Alkyne'
  },
  {
    id: 'chem-14',
    module: '有机化学',
    question: '"官能团"是指',
    options: ['有机化合物的分子式', '决定有机化合物化学性质的原子或原子团', '有机化合物的分子量', '有机化合物的沸点'],
    correctAnswer: 1,
    explanation: '官能团是决定有机化合物化学性质的原子或原子团。',
    englishTerm: 'Functional Group'
  },
  {
    id: 'chem-15',
    module: '有机化学',
    question: '乙醇的官能团是',
    options: ['羧基', '羟基', '氨基', '醛基'],
    correctAnswer: 1,
    explanation: '乙醇含有羟基（-OH）官能团。',
    englishTerm: 'Hydroxyl Group'
  },
  {
    id: 'chem-16',
    module: '有机化学',
    question: '乙酸的官能团是',
    options: ['羟基', '羧基', '氨基', '醛基'],
    correctAnswer: 1,
    explanation: '乙酸含有羧基（-COOH）官能团。',
    englishTerm: 'Carboxyl Group'
  },
  {
    id: 'chem-17',
    module: '化学术语',
    question: '"原子"是指',
    options: ['物质的最小粒子', '保持物质化学性质的最小粒子', '由原子核和电子组成的粒子', '带电的粒子'],
    correctAnswer: 2,
    explanation: '原子是由原子核和核外电子组成的基本粒子。',
    englishTerm: 'Atom'
  },
  {
    id: 'chem-18',
    module: '化学术语',
    question: '"分子"是指',
    options: ['物质的最小粒子', '保持物质化学性质的最小粒子', '带电的粒子', '由质子和中子组成的粒子'],
    correctAnswer: 1,
    explanation: '分子是保持物质化学性质的最小粒子。',
    englishTerm: 'Molecule'
  },
  {
    id: 'chem-19',
    module: '化学术语',
    question: '"离子"是指',
    options: ['不带电的粒子', '带电的原子或原子团', '中性的原子', '分子的一部分'],
    correctAnswer: 1,
    explanation: '离子是带电的原子或原子团，可以是阳离子（带正电）或阴离子（带负电）。',
    englishTerm: 'Ion'
  },
  {
    id: 'chem-20',
    module: '化学术语',
    question: '"元素"是指',
    options: ['物质的总称', '具有相同质子数的一类原子的总称', '化合物的组成部分', '混合物的组成部分'],
    correctAnswer: 1,
    explanation: '元素是具有相同质子数（核电荷数）的一类原子的总称。',
    englishTerm: 'Element'
  }
];

// 模块四：数据图表与科学推理 (20题)
export const dataAnalysisQuestions: ScienceChineseQuestion[] = [
  {
    id: 'data-1',
    module: '图表解读',
    question: '"折线图"通常用来展示',
    options: ['各部分占总体的比例', '数据随时间的变化趋势', '不同类别数据的对比', '数据的分布情况'],
    correctAnswer: 1,
    explanation: '折线图适合展示数据随时间或连续变量的变化趋势。',
    englishTerm: 'Line Chart'
  },
  {
    id: 'data-2',
    module: '图表解读',
    question: '"柱状图"通常用来展示',
    options: ['数据随时间的变化', '各部分占总体的比例', '不同类别数据的对比', '数据的相关性'],
    correctAnswer: 2,
    explanation: '柱状图适合对比不同类别或组之间的数据。',
    englishTerm: 'Bar Chart'
  },
  {
    id: 'data-3',
    module: '图表解读',
    question: '"饼图"通常用来展示',
    options: ['数据随时间的变化', '各部分占总体的比例', '不同类别数据的对比', '数据的分布情况'],
    correctAnswer: 1,
    explanation: '饼图适合展示各部分占总体的比例关系。',
    englishTerm: 'Pie Chart'
  },
  {
    id: 'data-4',
    module: '图表解读',
    question: '"散点图"通常用来展示',
    options: ['数据随时间的变化', '各部分占总体的比例', '两个变量之间的关系', '不同类别数据的对比'],
    correctAnswer: 2,
    explanation: '散点图适合展示两个变量之间的相关性或关系。',
    englishTerm: 'Scatter Plot'
  },
  {
    id: 'data-5',
    module: '图表解读',
    question: '"直方图"通常用来展示',
    options: ['数据的分布情况', '各部分占总体的比例', '数据随时间的变化', '两个变量的关系'],
    correctAnswer: 0,
    explanation: '直方图适合展示数据的频数分布情况。',
    englishTerm: 'Histogram'
  },
  {
    id: 'data-6',
    module: '实验数据分析',
    question: '"平均值"是指',
    options: ['数据中出现次数最多的数', '将所有数据求和后除以数据个数', '数据按大小排列后的中间值', '数据的最大值减去最小值'],
    correctAnswer: 1,
    explanation: '平均值是所有数据的总和除以数据的个数。',
    englishTerm: 'Mean'
  },
  {
    id: 'data-7',
    module: '实验数据分析',
    question: '"中位数"是指',
    options: ['数据中出现次数最多的数', '所有数据的平均值', '数据按大小排列后的中间值', '数据的最大值'],
    correctAnswer: 2,
    explanation: '中位数是将数据按大小顺序排列后位于中间位置的数值。',
    englishTerm: 'Median'
  },
  {
    id: 'data-8',
    module: '实验数据分析',
    question: '"众数"是指',
    options: ['数据的平均值', '数据中出现次数最多的数', '数据的中间值', '数据的最小值'],
    correctAnswer: 1,
    explanation: '众数是数据集中出现次数最多的数值。',
    englishTerm: 'Mode'
  },
  {
    id: 'data-9',
    module: '实验数据分析',
    question: '"极差"是指',
    options: ['数据的平均值', '数据的最大值减去最小值', '数据的方差', '数据的标准差'],
    correctAnswer: 1,
    explanation: '极差是数据集中最大值与最小值的差值。',
    englishTerm: 'Range'
  },
  {
    id: 'data-10',
    module: '实验数据分析',
    question: '"误差"是指',
    options: ['实验数据与真实值之间的差异', '实验的次数', '实验的时间', '实验的器材'],
    correctAnswer: 0,
    explanation: '误差是指测量值与真实值之间的差异。',
    englishTerm: 'Error'
  },
  {
    id: 'data-11',
    module: '科学推理',
    question: '"假设"是指',
    options: ['实验的结果', '对问题的一种可能解释', '已被证实的事实', '实验的步骤'],
    correctAnswer: 1,
    explanation: '假设是对问题的一种试探性解释，需要通过实验来验证。',
    englishTerm: 'Hypothesis'
  },
  {
    id: 'data-12',
    module: '科学推理',
    question: '"结论"是指',
    options: ['实验的目的', '根据实验结果得出的判断', '实验的过程', '实验的假设'],
    correctAnswer: 1,
    explanation: '结论是根据实验数据和分析得出的最终判断。',
    englishTerm: 'Conclusion'
  },
  {
    id: 'data-13',
    module: '科学推理',
    question: '"变量"是指',
    options: ['实验中保持不变的因素', '实验中可以变化的因素', '实验的结果', '实验的目的'],
    correctAnswer: 1,
    explanation: '变量是实验中可以变化或被测量的因素。',
    englishTerm: 'Variable'
  },
  {
    id: 'data-14',
    module: '科学推理',
    question: '"控制变量"是指',
    options: ['实验中需要改变的因素', '实验中保持不变的因素', '实验的结果', '实验的假设'],
    correctAnswer: 1,
    explanation: '控制变量是在实验中保持不变的因素，以确保实验结果的准确性。',
    englishTerm: 'Control Variable'
  },
  {
    id: 'data-15',
    module: '科学推理',
    question: '"自变量"是指',
    options: ['实验中被测量的因素', '实验中被主动改变的因素', '实验中保持不变的因素', '实验的结果'],
    correctAnswer: 1,
    explanation: '自变量是实验中被主动改变或控制的变量。',
    englishTerm: 'Independent Variable'
  },
  {
    id: 'data-16',
    module: '科学推理',
    question: '"因变量"是指',
    options: ['实验中被主动改变的因素', '实验中被测量的结果', '实验中保持不变的因素', '实验的假设'],
    correctAnswer: 1,
    explanation: '因变量是实验中被测量的结果，其变化取决于自变量。',
    englishTerm: 'Dependent Variable'
  },
  {
    id: 'data-17',
    module: '科学推理',
    question: '"证据"是指',
    options: ['个人的观点', '支持或反驳假设的事实或数据', '实验的目的', '实验的步骤'],
    correctAnswer: 1,
    explanation: '证据是支持或反驳假设的事实、数据或观察结果。',
    englishTerm: 'Evidence'
  },
  {
    id: 'data-18',
    module: '科学推理',
    question: '"理论"是指',
    options: ['未经证实的猜测', '经过大量实验验证的科学解释', '实验的结果', '实验的假设'],
    correctAnswer: 1,
    explanation: '理论是经过大量实验验证的、能够解释自然现象的科学解释。',
    englishTerm: 'Theory'
  },
  {
    id: 'data-19',
    module: '科学推理',
    question: '"定律"是指',
    options: ['个人的想法', '描述自然现象的规律，通常以数学形式表达', '实验的步骤', '实验的假设'],
    correctAnswer: 1,
    explanation: '定律是描述自然现象规律的陈述，通常可以用数学公式表达。',
    englishTerm: 'Law'
  },
  {
    id: 'data-20',
    module: '科学推理',
    question: '"观察"是指',
    options: ['做出假设', '通过感官或仪器获取信息', '得出结论', '进行实验'],
    correctAnswer: 1,
    explanation: '观察是通过感官或科学仪器获取关于自然现象的信息。',
    englishTerm: 'Observation'
  }
];

// 获取所有理科中文题目
export function getAllScienceChineseQuestions(): ScienceChineseQuestion[] {
  return [
    ...mathSymbolQuestions,
    ...physicsConceptQuestions,
    ...chemistryQuestions,
    ...dataAnalysisQuestions
  ];
}

// 根据模块获取题目
export function getScienceChineseQuestionsByModule(module: string): ScienceChineseQuestion[] {
  return getAllScienceChineseQuestions().filter(q => q.module === module);
}

// 获取所有模块名称
export function getScienceChineseModules(): string[] {
  const modules = new Set(getAllScienceChineseQuestions().map(q => q.module));
  return Array.from(modules);
}

// 随机获取指定数量的题目
export function getRandomScienceChineseQuestions(count: number): ScienceChineseQuestion[] {
  const allQuestions = getAllScienceChineseQuestions();
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
