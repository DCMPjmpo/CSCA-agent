/**
 * 文科中文专项题库
 * 针对东盟考生的文科中文学习需求设计
 */

export interface ArtsChineseQuestion {
  id: string;
  module: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  englishTerm?: string;
}

// 文学鉴赏题目
const literatureQuestions: ArtsChineseQuestion[] = [
  {
    id: 'lit-001',
    module: '古诗词',
    question: '"床前明月光，疑是地上霜。举头望明月，低头思故乡。"这首诗的作者是：',
    options: ['李白', '杜甫', '白居易', '王维'],
    correctAnswer: 0,
    explanation: '这是唐代诗人李白的《静夜思》，表达了诗人的思乡之情。',
    englishTerm: 'Jing Ye Si'
  },
  {
    id: 'lit-002',
    module: '古诗词',
    question: '"春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。"这首诗描写的季节是：',
    options: ['春季', '夏季', '秋季', '冬季'],
    correctAnswer: 0,
    explanation: '诗中"春眠"、"花落"等词语表明这是春天。',
    englishTerm: 'Spring Morning'
  },
  {
    id: 'lit-003',
    module: '古诗词',
    question: '"独在异乡为异客，每逢佳节倍思亲。遥知兄弟登高处，遍插茱萸少一人。"这首诗中的"佳节"指的是：',
    options: ['春节', '中秋节', '重阳节', '端午节'],
    correctAnswer: 2,
    explanation: '重阳节有登高、插茱萸的习俗，诗中"登高处"、"遍插茱萸"点明了这是重阳节。',
    englishTerm: 'Double Ninth Festival'
  },
  {
    id: 'lit-004',
    module: '古诗词',
    question: '"两个黄鹂鸣翠柳，一行白鹭上青天。窗含西岭千秋雪，门泊东吴万里船。"这首诗的体裁是：',
    options: ['五言绝句', '七言绝句', '五言律诗', '七言律诗'],
    correctAnswer: 3,
    explanation: '这首杜甫的《绝句》是七言律诗，每句七个字，共四句。',
    englishTerm: 'Seven-character Quatrain'
  },
  {
    id: 'lit-005',
    module: '现代文学',
    question: '鲁迅的《阿Q正传》主要批判了什么？',
    options: ['封建礼教', '国民劣根性', '帝国主义', '官僚主义'],
    correctAnswer: 1,
    explanation: '《阿Q正传》通过阿Q这个人物形象，批判了国民的劣根性，如精神胜利法等。',
    englishTerm: 'The True Story of Ah Q'
  },
  {
    id: 'lit-006',
    module: '现代文学',
    question: '茅盾的代表作《子夜》主要描写的是哪个时期的中国社会？',
    options: ['抗日战争时期', '解放战争时期', '民国初年', '20世纪30年代'],
    correctAnswer: 3,
    explanation: '《子夜》描写了20世纪30年代中国社会的黑暗现实，展现了民族资本家的悲剧命运。',
    englishTerm: 'Midnight'
  },
  {
    id: 'lit-007',
    module: '现代文学',
    question: '"荷塘月色"是哪位作家的作品？',
    options: ['鲁迅', '朱自清', '巴金', '老舍'],
    correctAnswer: 1,
    explanation: '《荷塘月色》是朱自清的著名散文，描写了清华园荷塘的月色美景。',
    englishTerm: 'Moonlight over the Lotus Pond'
  },
  {
    id: 'lit-008',
    module: '文学常识',
    question: '中国古代四大名著不包括：',
    options: ['《红楼梦》', '《三国演义》', '《水浒传》', '《聊斋志异》'],
    correctAnswer: 3,
    explanation: '中国古代四大名著是《红楼梦》、《三国演义》、《水浒传》和《西游记》。',
    englishTerm: 'Four Great Classical Novels'
  },
  {
    id: 'lit-009',
    module: '文学常识',
    question: '"四书五经"中的"四书"不包括：',
    options: ['《大学》', '《中庸》', '《论语》', '《诗经》'],
    correctAnswer: 3,
    explanation: '四书包括《大学》、《中庸》、《论语》和《孟子》。《诗经》属于五经。',
    englishTerm: 'Four Books'
  },
  {
    id: 'lit-010',
    module: '文学常识',
    question: '中国文学史上第一位伟大的诗人是：',
    options: ['李白', '杜甫', '屈原', '陶渊明'],
    correctAnswer: 2,
    explanation: '屈原是中国文学史上第一位伟大的诗人，代表作《离骚》是中国古代最长的抒情诗。',
    englishTerm: 'Qu Yuan'
  },
  {
    id: 'lit-011',
    module: '古诗词',
    question: '"山重水复疑无路，柳暗花明又一村。"这句诗出自哪位诗人？',
    options: ['李白', '杜甫', '陆游', '苏轼'],
    correctAnswer: 2,
    explanation: '这是陆游《游山西村》中的名句，表达了困境中可能出现转机的哲理。',
    englishTerm: 'A New Village'
  },
  {
    id: 'lit-012',
    module: '古诗词',
    question: '"人生自古谁无死，留取丹心照汗青。"表达了诗人怎样的情怀？',
    options: ['思乡之情', '爱国情怀', '山水之乐', '爱情相思'],
    correctAnswer: 1,
    explanation: '这是文天祥的名句，表达了诗人视死如归的爱国情怀。',
    englishTerm: 'Loyalty'
  },
  {
    id: 'lit-013',
    module: '现代文学',
    question: '巴金的"激流三部曲"不包括：',
    options: ['《家》', '《春》', '《秋》', '《雾》'],
    correctAnswer: 3,
    explanation: '巴金的"激流三部曲"是《家》、《春》、《秋》。《雾》是"爱情三部曲"之一。',
    englishTerm: 'Torrent Trilogy'
  },
  {
    id: 'lit-014',
    module: '现代文学',
    question: '老舍的代表作《茶馆》主要通过什么反映社会变迁？',
    options: ['一个茶馆的兴衰', '一个家族的变迁', '一个人的命运', '一个城市的发展'],
    correctAnswer: 0,
    explanation: '《茶馆》通过一个茶馆在不同时代的变化，反映了中国近代社会的变迁。',
    englishTerm: 'Teahouse'
  },
  {
    id: 'lit-015',
    module: '文学常识',
    question: '"楚辞"的代表作家是：',
    options: ['孔子', '孟子', '屈原', '宋玉'],
    correctAnswer: 2,
    explanation: '屈原是"楚辞"的创立者和代表作家，其作品具有独特的浪漫主义风格。',
    englishTerm: 'Chu Ci'
  },
  {
    id: 'lit-016',
    module: '古诗词',
    question: '"但愿人长久，千里共婵娟。"中的"婵娟"指的是：',
    options: ['美人', '月亮', '花朵', '美酒'],
    correctAnswer: 1,
    explanation: '"婵娟"在这里指月亮，表达了对亲人的思念和美好祝愿。',
    englishTerm: 'Moon'
  },
  {
    id: 'lit-017',
    module: '古诗词',
    question: '"采菊东篱下，悠然见南山。"表现了诗人怎样的生活态度？',
    options: ['积极进取', '归隐田园', '追求功名', '忧国忧民'],
    correctAnswer: 1,
    explanation: '这是陶渊明的诗句，表现了诗人归隐田园、悠然自得的生活态度。',
    englishTerm: 'Retirement'
  },
  {
    id: 'lit-018',
    module: '现代文学',
    question: '郭沫若的《女神》是一部什么体裁的作品？',
    options: ['小说', '散文', '诗歌', '戏剧'],
    correctAnswer: 2,
    explanation: '《女神》是郭沫若的诗歌集，是中国现代诗歌的代表作之一。',
    englishTerm: 'Goddess'
  },
  {
    id: 'lit-019',
    module: '文学常识',
    question: '中国最早的诗歌总集是：',
    options: ['《楚辞》', '《诗经》', '《唐诗三百首》', '《乐府诗集》'],
    correctAnswer: 1,
    explanation: '《诗经》是中国最早的诗歌总集，收录了西周至春秋时期的诗歌。',
    englishTerm: 'The Book of Songs'
  },
  {
    id: 'lit-020',
    module: '文学常识',
    question: '"建安文学"的代表人物不包括：',
    options: ['曹操', '曹丕', '曹植', '陶渊明'],
    correctAnswer: 3,
    explanation: '建安文学的代表人物是"三曹"（曹操、曹丕、曹植）和"建安七子"。陶渊明是东晋时期的诗人。',
    englishTerm: 'Jian\'an Literature'
  },
];

// 历史文化题目
const historyQuestions: ArtsChineseQuestion[] = [
  {
    id: 'hist-001',
    module: '中国历史',
    question: '中国历史上第一个统一的封建王朝是：',
    options: ['夏朝', '商朝', '周朝', '秦朝'],
    correctAnswer: 3,
    explanation: '秦朝是中国历史上第一个统一的中央集权制封建王朝，由秦始皇建立。',
    englishTerm: 'Qin Dynasty'
  },
  {
    id: 'hist-002',
    module: '中国历史',
    question: '唐朝的开国皇帝是：',
    options: ['李渊', '李世民', '李隆基', '李治'],
    correctAnswer: 0,
    explanation: '李渊是唐朝的开国皇帝，庙号唐高祖。李世民是第二位皇帝。',
    englishTerm: 'Tang Dynasty'
  },
  {
    id: 'hist-003',
    module: '中国历史',
    question: '辛亥革命发生在哪一年？',
    options: ['1905年', '1911年', '1919年', '1921年'],
    correctAnswer: 1,
    explanation: '辛亥革命发生于1911年，推翻了清朝的统治，结束了中国两千多年的封建帝制。',
    englishTerm: 'Xinhai Revolution'
  },
  {
    id: 'hist-004',
    module: '中国历史',
    question: '长城最早修建于哪个朝代？',
    options: ['秦朝', '汉朝', '明朝', '春秋战国时期'],
    correctAnswer: 3,
    explanation: '长城最早修建于春秋战国时期，秦始皇统一后将各国的长城连接起来。',
    englishTerm: 'Great Wall'
  },
  {
    id: 'hist-005',
    module: '中国历史',
    question: '四大发明不包括：',
    options: ['造纸术', '印刷术', '蒸汽机', '指南针'],
    correctAnswer: 2,
    explanation: '中国古代四大发明是造纸术、印刷术、火药和指南针。蒸汽机是西方发明的。',
    englishTerm: 'Four Great Inventions'
  },
  {
    id: 'hist-006',
    module: '世界历史',
    question: '世界上最早的文明发源地是：',
    options: ['美索不达米亚', '古埃及', '古印度', '古中国'],
    correctAnswer: 0,
    explanation: '美索不达米亚（两河流域）是世界上最早的文明发源地，位于今天的伊拉克地区。',
    englishTerm: 'Mesopotamia'
  },
  {
    id: 'hist-007',
    module: '世界历史',
    question: '第一次世界大战爆发于哪一年？',
    options: ['1912年', '1914年', '1916年', '1918年'],
    correctAnswer: 1,
    explanation: '第一次世界大战爆发于1914年，以奥匈帝国皇储弗朗茨·斐迪南大公遇刺为导火索。',
    englishTerm: 'World War I'
  },
  {
    id: 'hist-008',
    module: '世界历史',
    question: '美国独立战争发生在哪个世纪？',
    options: ['17世纪', '18世纪', '19世纪', '20世纪'],
    correctAnswer: 1,
    explanation: '美国独立战争发生在18世纪（1775-1783年），最终美国赢得独立。',
    englishTerm: 'American Revolution'
  },
  {
    id: 'hist-009',
    module: '文化常识',
    question: '中国的四大传统节日不包括：',
    options: ['春节', '清明节', '端午节', '中秋节'],
    correctAnswer: 1,
    explanation: '中国四大传统节日是春节、清明节、端午节和中秋节。清明节是二十四节气之一。',
    englishTerm: 'Traditional Festivals'
  },
  {
    id: 'hist-010',
    module: '文化常识',
    question: '中国的国花是：',
    options: ['牡丹', '梅花', '菊花', '兰花'],
    correctAnswer: 0,
    explanation: '牡丹是中国的国花，象征着富贵和吉祥。',
    englishTerm: 'National Flower'
  },
  {
    id: 'hist-011',
    module: '中国历史',
    question: '汉武帝时期派谁出使西域？',
    options: ['张骞', '班超', '卫青', '霍去病'],
    correctAnswer: 0,
    explanation: '张骞是汉武帝时期著名的外交家，两次出使西域，开辟了丝绸之路。',
    englishTerm: 'Zhang Qian'
  },
  {
    id: 'hist-012',
    module: '中国历史',
    question: '唐朝时期，日本派遣到中国学习的使者被称为：',
    options: ['留学生', '遣唐使', '学问僧', '使节'],
    correctAnswer: 1,
    explanation: '遣唐使是日本派遣到唐朝学习的外交使团和留学生，对日本文化影响深远。',
    englishTerm: 'Japanese Envoys to Tang'
  },
  {
    id: 'hist-013',
    module: '中国历史',
    question: '郑和下西洋发生在哪个朝代？',
    options: ['宋朝', '元朝', '明朝', '清朝'],
    correctAnswer: 2,
    explanation: '郑和下西洋发生在明朝永乐年间，是世界历史上规模最大的海上探险活动之一。',
    englishTerm: 'Zheng He\'s Voyages'
  },
  {
    id: 'hist-014',
    module: '世界历史',
    question: '法国大革命发生在哪一年？',
    options: ['1776年', '1789年', '1799年', '1804年'],
    correctAnswer: 1,
    explanation: '法国大革命爆发于1789年7月14日，攻占巴士底狱是其标志性事件。',
    englishTerm: 'French Revolution'
  },
  {
    id: 'hist-015',
    module: '世界历史',
    question: '第二次世界大战的转折点是：',
    options: ['诺曼底登陆', '斯大林格勒战役', '珍珠港事件', '柏林战役'],
    correctAnswer: 1,
    explanation: '斯大林格勒战役（1942-1943年）是第二次世界大战的转折点，苏联军队击败了德军。',
    englishTerm: 'Battle of Stalingrad'
  },
  {
    id: 'hist-016',
    module: '文化常识',
    question: '中国传统的十二生肖不包括：',
    options: ['龙', '蛇', '猫', '狗'],
    correctAnswer: 2,
    explanation: '十二生肖是鼠、牛、虎、兔、龙、蛇、马、羊、猴、鸡、狗、猪，不包括猫。',
    englishTerm: 'Chinese Zodiac'
  },
  {
    id: 'hist-017',
    module: '文化常识',
    question: '中国的四大名著中，哪一部是章回体小说？',
    options: ['全部都是', '只有《三国演义》', '只有《红楼梦》', '只有《水浒传》'],
    correctAnswer: 0,
    explanation: '中国四大名著《红楼梦》、《三国演义》、《水浒传》、《西游记》都是章回体小说。',
    englishTerm: 'Chapter Novel'
  },
  {
    id: 'hist-018',
    module: '中国历史',
    question: '科举制度创立于哪个朝代？',
    options: ['汉朝', '隋朝', '唐朝', '宋朝'],
    correctAnswer: 1,
    explanation: '科举制度创立于隋朝，完善于唐朝，是中国古代重要的选官制度。',
    englishTerm: 'Imperial Examination'
  },
  {
    id: 'hist-019',
    module: '世界历史',
    question: '古埃及文明发源于哪条河流？',
    options: ['幼发拉底河', '底格里斯河', '尼罗河', '印度河'],
    correctAnswer: 2,
    explanation: '古埃及文明发源于尼罗河流域，尼罗河的定期泛滥为农业发展提供了条件。',
    englishTerm: 'Nile River'
  },
  {
    id: 'hist-020',
    module: '文化常识',
    question: '中国传统婚礼中，新娘通常穿什么颜色的礼服？',
    options: ['白色', '红色', '蓝色', '绿色'],
    correctAnswer: 1,
    explanation: '在中国传统文化中，红色象征吉祥和喜庆，新娘通常穿红色礼服。',
    englishTerm: 'Traditional Wedding'
  },
];

// 论述写作题目
const essayQuestions: ArtsChineseQuestion[] = [
  {
    id: 'essay-001',
    module: '议论文',
    question: '议论文的三要素不包括：',
    options: ['论点', '论据', '论证', '描写'],
    correctAnswer: 3,
    explanation: '议论文的三要素是论点、论据和论证。描写是记叙文的表达方式。',
    englishTerm: 'Argumentative Essay'
  },
  {
    id: 'essay-002',
    module: '议论文',
    question: '"提出问题-分析问题-解决问题"是哪种文章的结构？',
    options: ['记叙文', '说明文', '议论文', '散文'],
    correctAnswer: 2,
    explanation: '议论文通常采用"提出问题-分析问题-解决问题"的结构，即引论、本论、结论。',
    englishTerm: 'Essay Structure'
  },
  {
    id: 'essay-003',
    module: '议论文',
    question: '下列哪个不属于议论文的论证方法？',
    options: ['举例论证', '对比论证', '夸张手法', '引用论证'],
    correctAnswer: 2,
    explanation: '夸张手法是修辞手法，不是论证方法。论证方法包括举例、对比、引用、比喻等。',
    englishTerm: 'Argumentation Methods'
  },
  {
    id: 'essay-004',
    module: '应用文',
    question: '请假条属于哪种应用文？',
    options: ['书信类', '条据类', '告启类', '契约类'],
    correctAnswer: 1,
    explanation: '请假条属于条据类应用文，用于说明请假原因和时间。',
    englishTerm: 'Leave Application'
  },
  {
    id: 'essay-005',
    module: '应用文',
    question: '写求职信时，应该重点突出什么？',
    options: ['个人兴趣爱好', '个人能力和经验', '家庭背景', '外貌特征'],
    correctAnswer: 1,
    explanation: '求职信应重点突出个人的专业能力、工作经验和应聘优势，以展示自己适合该职位。',
    englishTerm: 'Cover Letter'
  },
  {
    id: 'essay-006',
    module: '应用文',
    question: '通知的格式不包括：',
    options: ['标题', '称呼', '正文', '结尾语'],
    correctAnswer: 3,
    explanation: '通知的格式包括标题、称呼、正文和落款。结尾语是书信的组成部分。',
    englishTerm: 'Notice'
  },
  {
    id: 'essay-007',
    module: '材料分析',
    question: '分析材料时，首先要做的是：',
    options: ['得出结论', '寻找关键词', '写文章', '引用名人名言'],
    correctAnswer: 1,
    explanation: '分析材料首先要阅读材料，找出关键词和中心思想，理解材料的含义。',
    englishTerm: 'Material Analysis'
  },
  {
    id: 'essay-008',
    module: '材料分析',
    question: '"透过现象看本质"体现了哪种分析方法？',
    options: ['归纳法', '演绎法', '因果分析法', '本质分析法'],
    correctAnswer: 3,
    explanation: '透过现象看本质是一种本质分析法，要求从表面现象深入到事物的本质。',
    englishTerm: 'Essence Analysis'
  },
  {
    id: 'essay-009',
    module: '议论文',
    question: '议论文的论点应该具备什么特点？',
    options: ['模糊不清', '明确具体', '模棱两可', '长篇大论'],
    correctAnswer: 1,
    explanation: '议论文的论点应该明确、具体，让读者清楚作者的观点和立场。',
    englishTerm: 'Thesis Statement'
  },
  {
    id: 'essay-010',
    module: '议论文',
    question: '下列哪个论据最有说服力？',
    options: ['个人观点', '道听途说', '权威数据', '主观臆断'],
    correctAnswer: 2,
    explanation: '权威数据是最有说服力的论据，因为它具有客观性和可信度。',
    englishTerm: 'Evidence'
  },
  {
    id: 'essay-011',
    module: '应用文',
    question: '邀请函的结尾通常用什么敬语？',
    options: ['此致敬礼', '敬请光临', '谢谢阅读', '顺颂时祺'],
    correctAnswer: 1,
    explanation: '邀请函的结尾通常用"敬请光临"、"恭候光临"等敬语，表示邀请对方参加。',
    englishTerm: 'Invitation'
  },
  {
    id: 'essay-012',
    module: '应用文',
    question: '倡议书的主要目的是什么？',
    options: ['叙述故事', '提出建议', '抒发感情', '说明事实'],
    correctAnswer: 1,
    explanation: '倡议书的主要目的是提出倡议和建议，号召大家共同行动。',
    englishTerm: 'Proposal'
  },
  {
    id: 'essay-013',
    module: '材料分析',
    question: '分析图表数据时，应该注意什么？',
    options: ['只看表面数字', '忽略单位', '分析变化趋势', '主观猜测'],
    correctAnswer: 2,
    explanation: '分析图表数据时应注意数据的变化趋势、对比关系和背后的原因。',
    englishTerm: 'Data Analysis'
  },
  {
    id: 'essay-014',
    module: '议论文',
    question: '"摆事实，讲道理"指的是哪种论证方法？',
    options: ['举例论证', '道理论证', '对比论证', '比喻论证'],
    correctAnswer: 0,
    explanation: '"摆事实"就是举例论证，通过具体事例来证明论点。',
    englishTerm: 'Example Argument'
  },
  {
    id: 'essay-015',
    module: '议论文',
    question: '议论文的结论部分应该怎么做？',
    options: ['提出新问题', '总结论点', '添加新论据', '详细描述'],
    correctAnswer: 1,
    explanation: '议论文的结论应总结全文，重申论点，给读者留下深刻印象。',
    englishTerm: 'Conclusion'
  },
  {
    id: 'essay-016',
    module: '应用文',
    question: '感谢信的写作对象通常是：',
    options: ['自己', '家人', '帮助过自己的人', '陌生人'],
    correctAnswer: 2,
    explanation: '感谢信是写给帮助过自己的人，表达感激之情。',
    englishTerm: 'Thank You Letter'
  },
  {
    id: 'essay-017',
    module: '应用文',
    question: '报告的特点不包括：',
    options: ['真实性', '时效性', '虚构性', '准确性'],
    correctAnswer: 2,
    explanation: '报告要求真实、准确、及时，不能虚构。虚构性是小说等文学作品的特点。',
    englishTerm: 'Report'
  },
  {
    id: 'essay-018',
    module: '材料分析',
    question: '分析漫画时，应该关注什么？',
    options: ['颜色搭配', '画面细节', '作者签名', '纸张质量'],
    correctAnswer: 1,
    explanation: '分析漫画应关注画面细节、人物表情、背景等，理解漫画的寓意。',
    englishTerm: 'Cartoon Analysis'
  },
  {
    id: 'essay-019',
    module: '议论文',
    question: '下列哪个是好的议论文标题？',
    options: ['谈读书', '随便写写', '不知道写什么', '无题'],
    correctAnswer: 0,
    explanation: '好的议论文标题应明确、简洁，能够概括文章的中心论点。',
    englishTerm: 'Essay Title'
  },
  {
    id: 'essay-020',
    module: '议论文',
    question: '论证过程中，论据和论点的关系是：',
    options: ['论据支持论点', '论点支持论据', '互不相关', '相互矛盾'],
    correctAnswer: 0,
    explanation: '论据是用来证明论点的材料，应该支持论点，使论点更有说服力。',
    englishTerm: 'Argument Support'
  },
];

// 获取所有文科中文题目
export function getAllArtsChineseQuestions(): ArtsChineseQuestion[] {
  return [
    ...literatureQuestions,
    ...historyQuestions,
    ...essayQuestions
  ];
}

// 根据模块获取题目
export function getArtsChineseQuestionsByModule(module: string): ArtsChineseQuestion[] {
  return getAllArtsChineseQuestions().filter(q => q.module === module);
}
