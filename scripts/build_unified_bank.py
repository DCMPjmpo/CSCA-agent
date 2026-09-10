"""
解析 Chemistry Practice 真实试卷 + 合并所有题库 → data/processed/questions_from_txt.json
用法: python scripts/build_unified_bank.py

输出题库结构（与现有 Question 接口对齐）:
{
  metadata: { totalQuestions, sources, ... },
  questions: [
    {
      id, subject, track, questionNumber, question, type, partTitle, module,
      sourceFile, lineNumber, uniqueId, options, answer, score, difficulty,
      source: 'real_exam' | 'basic_practice' | 'science_chinese' | 'arts_chinese' | 'legacy'
    }
  ]
}
"""
import json
import re
from pathlib import Path

ROOT = Path(r"D:\文件\工作室\CSCA-agent-master")
CHEM_TXT = ROOT / "data" / "cleaned_markdown" / "Chemistry Practice (multiple choice questions).txt"
OUTPUT = ROOT / "data" / "processed" / "questions_from_txt.json"


def parse_chemistry_practice():
    """解析 Chemistry Practice 真实试卷 → 标准化题目列表"""
    text = CHEM_TXT.read_text(encoding="utf-8")
    lines = text.split("\n")

    questions = []
    current_part = ""
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # 检测部分标题 (I. II. III. IV. V. VI. VII. VIII.)
        part_match = re.match(r"^[IVX]+\.\s+(.+)", line)
        if part_match and not re.match(r"^\d+\.", line):
            current_part = part_match.group(1).strip()
            i += 1
            continue

        # 检测题目行: "1. About..." 或 "1. About... (1)... (2)... (3)..."
        q_match = re.match(r"^(\d+)\.\s+(.+)", line)
        if q_match:
            q_num = int(q_match.group(1))
            q_content = q_match.group(2).strip()

            # 查找选项行（可能在下一行）
            options_line = ""
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # 选项行格式: "A. xxx B. xxx C. xxx D. xxx"
                if re.match(r"^[A-D]\.", next_line):
                    options_line = next_line
                    i += 1
                else:
                    # 选项可能在当前行末尾
                    opt_in_line = re.search(r"A\.\s.+B\.\s.+C\.\s.+D\.\s.+", q_content)
                    if opt_in_line:
                        options_line = opt_in_line.group()
                        q_content = re.sub(r"A\.\s.+B\.\s.+C\.\s.+D\.\s.+", "", q_content).strip()

            # 解析选项
            options = []
            if options_line:
                # 匹配 A. xxx B. xxx C. xxx D. xxx
                opts = re.findall(r"([A-D])\.\s+([^A-D]+?)(?=\s+[A-D]\.|$)", options_line)
                for key, value in opts:
                    options.append({"key": key, "value": value.strip()})

            # 清理题干（去除 Syllabus 标注）
            clean_q = re.sub(r"\(Syllabus:[^)]+\)", "", q_content).strip()
            # 去除 (1)(2)(3) 前的冗余空格
            clean_q = re.sub(r"\s+", " ", clean_q)

            # 推断难度（基于题号区间，粗略）
            if q_num <= 12:
                difficulty = "easy"
            elif q_num <= 36:
                difficulty = "medium"
            else:
                difficulty = "hard"

            # 推断知识点模块
            module = current_part.split("(")[0].strip() if current_part else "Chemistry"

            questions.append({
                "id": f"chem_real_{q_num:03d}",
                "subject": "化学",
                "track": "理科",
                "questionNumber": q_num,
                "question": clean_q,
                "type": "选择题",
                "partTitle": current_part,
                "module": module,
                "sourceFile": "Chemistry Practice (multiple choice questions).docx",
                "lineNumber": i + 1,
                "uniqueId": f"chem_real_{q_num:03d}",
                "options": options if options else None,
                "answer": None,  # 真实试卷未提供答案 key，需后续补充
                "score": 3,
                "difficulty": difficulty,
                "source": "real_exam"
            })
        i += 1

    return questions


def get_mock_questions():
    """返回 MOCK_QUESTIONS 的标准化形态（从 route.ts 手动提取）"""
    mocks = []
    # 基础汉语 10 题
    chinese_mocks = [
        (1, '下列词语中，书写完全正确的一项是：', ['迫不急待', '再接再厉', '一愁莫展', '谈笑风声'], 1, 'medium', '汉语基础知识'),
        (2, '选出下列句子中没有语病的一项：', ['通过这次活动，使我们增长了见识。', '他不但会唱歌，而且会跳舞。', '我们要防止不发生类似事故。', '这种精神是值得我们学习的榜样。'], 1, 'medium', '语法运用'),
        (3, '"春风又绿江南岸"中"绿"字的词性是：', ['名词', '动词', '形容词', '副词'], 1, 'easy', '词汇运用'),
        (4, '下列哪个成语使用正确？', ['他的演讲引起了大家的共鸣，全场鸦雀无声。', '春天来了，草木葱茏，万象更新。', '他学习刻苦，成绩一落千丈。', '这道数学题很简单，简直难以置信。'], 1, 'medium', '成语运用'),
        (5, '下列句子中，标点符号使用正确的是：', ['他问："你今天有空吗"?', '我喜欢的水果有苹果、香蕉、橙子等。', '这本书的作者是鲁迅先生写的。', '公园里的花真多啊！有牡丹、玫瑰、菊花……等。'], 1, 'easy', '标点符号'),
        (6, '下列词语中，加点字读音完全正确的一项是：', ['颓唐(tuí)、踌躇(chú)、蹒跚(pán)', '琐屑(xiāo)、差使(chāi)、交卸(xiè)', '狼藉(jí)、簌簌(sù)、颓唐(tuì)', '踌躇(zhù)、蹒跚(mán)、琐屑(xiè)'], 0, 'medium', '字音'),
        (7, '下列词语中，感情色彩与其他三项不同的是：', ['坚强', '勇敢', '顽固', '聪明'], 2, 'easy', '词语感情色彩'),
        (8, '"他的话像一股暖流，温暖了我的心"这句话使用的修辞手法是：', ['比喻', '拟人', '夸张', '排比'], 0, 'easy', '修辞手法'),
        (9, '下列句子中，属于被动句的是：', ['小明写完了作业。', '作业被小明写完了。', '小明把作业写完了。', '作业写完了。'], 1, 'easy', '句式'),
        (10, '"鲁迅是中国现代文学的奠基人"这句话的主语是：', ['鲁迅', '中国', '文学', '奠基人'], 0, 'easy', '句子成分'),
    ]
    for q_num, q, opts, ans, diff, mod in chinese_mocks:
        mocks.append({
            "id": f"chinese_mock_{q_num:03d}",
            "subject": "基础汉语", "track": "通用", "questionNumber": q_num,
            "question": q, "type": "选择题", "partTitle": "基础练习",
            "module": mod, "sourceFile": "MOCK_QUESTIONS (basic practice)",
            "lineNumber": q_num, "uniqueId": f"chinese_mock_{q_num:03d}",
            "options": [{"key": chr(65+i), "value": v} for i, v in enumerate(opts)],
            "answer": chr(65+ans), "score": 3, "difficulty": diff,
            "source": "basic_practice"
        })

    # 数学 10 题
    math_mocks = [
        (1, '若集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B = ', ['{1, 2}', '{2, 3}', '{3, 4}', '{1, 4}'], 1, 'easy', '集合'),
        (2, '函数 f(x) = x² - 4x + 3 的最小值是', ['-1', '0', '1', '3'], 0, 'medium', '函数'),
        (3, '等差数列 2, 5, 8, 11... 的第10项是', ['26', '27', '29', '32'], 2, 'medium', '数列'),
        (4, '若 sin θ = 3/5，且 θ 为锐角，则 cos θ = ', ['3/5', '4/5', '3/4', '4/3'], 1, 'medium', '三角函数'),
        (5, '直线 y = 2x + 1 与 x 轴的交点坐标是', ['(0, 1)', '(1, 0)', '(-1/2, 0)', '(0, -1/2)'], 2, 'easy', '解析几何'),
        (6, 'log₂ 8 = ', ['2', '3', '4', '8'], 1, 'easy', '对数'),
        (7, '若 x + y = 5，xy = 6，则 x² + y² = ', ['11', '13', '25', '36'], 1, 'medium', '代数'),
        (8, '圆的方程 (x-1)² + (y+2)² = 9 的圆心坐标是', ['(1, 2)', '(-1, 2)', '(1, -2)', '(-1, -2)'], 2, 'easy', '圆'),
        (9, 'lim(x→0) sin(x)/x = ', ['0', '1', '∞', '不存在'], 1, 'medium', '极限'),
        (10, '函数 y = eˣ 的导数是', ['eˣ', 'xeˣ⁻¹', 'eˣ⁺¹', '1/eˣ'], 0, 'easy', '导数'),
    ]
    for q_num, q, opts, ans, diff, mod in math_mocks:
        mocks.append({
            "id": f"math_mock_{q_num:03d}",
            "subject": "数学", "track": "理科", "questionNumber": q_num,
            "question": q, "type": "选择题", "partTitle": "基础练习",
            "module": mod, "sourceFile": "MOCK_QUESTIONS (basic practice)",
            "lineNumber": q_num, "uniqueId": f"math_mock_{q_num:03d}",
            "options": [{"key": chr(65+i), "value": v} for i, v in enumerate(opts)],
            "answer": chr(65+ans), "score": 3, "difficulty": diff,
            "source": "basic_practice"
        })

    # 物理 10 题
    physics_mocks = [
        (1, '下列哪个是标量？', ['速度', '加速度', '力', '质量'], 3, 'easy', '力学基础'),
        (2, '物体做匀速圆周运动时，其加速度方向', ['沿切线方向', '指向圆心', '背离圆心', '为零'], 1, 'medium', '圆周运动'),
        (3, '根据牛顿第三定律，作用力与反作用力', ['大小相等，方向相同', '大小相等，方向相反', '大小不等，方向相反', '作用在同一物体上'], 1, 'easy', '牛顿定律'),
        (4, '理想气体状态方程是', ['PV = nRT', 'PV = RT', 'P = nRT/V', 'V = nRT/P'], 0, 'medium', '热学'),
        (5, '简谐运动的位移公式为 x = A sin(ωt + φ)，其中 A 表示', ['周期', '频率', '振幅', '初相位'], 2, 'easy', '振动'),
        (6, '光在真空中的传播速度约为', ['3×10⁶ m/s', '3×10⁷ m/s', '3×10⁸ m/s', '3×10⁹ m/s'], 2, 'easy', '光学'),
        (7, '电阻 R = 10Ω，电流 I = 2A，则电压 U = ', ['5V', '10V', '20V', '40V'], 2, 'easy', '电路'),
        (8, '动能的公式是', ['E = mgh', 'E = ½mv²', 'E = mc²', 'E = Pt'], 1, 'easy', '机械能'),
        (9, '功率的公式是', ['P = W/t', 'P = Fv', 'P = UI', '以上都是'], 3, 'medium', '功和能'),
        (10, '密度的公式是', ['ρ = m/V', 'ρ = V/m', 'ρ = mv', 'ρ = m+v'], 0, 'easy', '物质性质'),
    ]
    for q_num, q, opts, ans, diff, mod in physics_mocks:
        mocks.append({
            "id": f"physics_mock_{q_num:03d}",
            "subject": "物理", "track": "理科", "questionNumber": q_num,
            "question": q, "type": "选择题", "partTitle": "基础练习",
            "module": mod, "sourceFile": "MOCK_QUESTIONS (basic practice)",
            "lineNumber": q_num, "uniqueId": f"physics_mock_{q_num:03d}",
            "options": [{"key": chr(65+i), "value": v} for i, v in enumerate(opts)],
            "answer": chr(65+ans), "score": 3, "difficulty": diff,
            "source": "basic_practice"
        })

    # 化学 10 题（MOCK，与真实试卷分开）
    chem_mocks = [
        (1, '下列物质中，属于电解质的是', ['蔗糖', '酒精', '氯化钠', '二氧化碳'], 2, 'easy', '电解质'),
        (2, '在周期表中，同一周期从左到右，原子半径', ['逐渐增大', '逐渐减小', '先增大后减小', '保持不变'], 1, 'medium', '元素周期律'),
        (3, '氧化还原反应的本质是', ['氧原子的得失', '电子的转移', '化合价的改变', '新物质的生成'], 1, 'medium', '氧化还原'),
        (4, '下列气体中，不能用浓硫酸干燥的是', ['H₂', 'O₂', 'NH₃', 'CO₂'], 2, 'medium', '气体干燥'),
        (5, '苯的分子式是', ['C₆H₆', 'C₆H₁₂', 'C₅H₁₀', 'C₇H₈'], 0, 'easy', '有机化学'),
        (6, '水的化学式是', ['H₂O', 'CO₂', 'NaCl', 'HCl'], 0, 'easy', '化学式'),
        (7, 'NaOH 是', ['酸', '碱', '盐', '氧化物'], 1, 'easy', '酸碱盐'),
        (8, '化学反应前后，质量守恒定律表明', ['质量增加', '质量减少', '质量不变', '质量先增后减'], 2, 'easy', '质量守恒'),
        (9, '元素周期表中，原子序数等于', ['质子数', '中子数', '电子数', '质量数'], 0, 'easy', '原子结构'),
        (10, '盐酸的化学式是', ['H₂SO₄', 'HCl', 'HNO₃', 'NaOH'], 1, 'easy', '常见酸'),
    ]
    for q_num, q, opts, ans, diff, mod in chem_mocks:
        mocks.append({
            "id": f"chem_mock_{q_num:03d}",
            "subject": "化学", "track": "理科", "questionNumber": q_num,
            "question": q, "type": "选择题", "partTitle": "基础练习",
            "module": mod, "sourceFile": "MOCK_QUESTIONS (basic practice)",
            "lineNumber": q_num, "uniqueId": f"chem_mock_{q_num:03d}",
            "options": [{"key": chr(65+i), "value": v} for i, v in enumerate(opts)],
            "answer": chr(65+ans), "score": 3, "difficulty": diff,
            "source": "basic_practice"
        })

    return mocks


def main():
    print("=== 构建统一题库 ===")

    # 1. 解析 Chemistry Practice 真实试卷
    print("1. 解析 Chemistry Practice...")
    chem_real = parse_chemistry_practice()
    print(f"   化学真实题目: {len(chem_real)} 题")

    # 2. MOCK_QUESTIONS 基础练习题
    print("2. 整合 MOCK_QUESTIONS 基础练习题...")
    mocks = get_mock_questions()
    print(f"   基础练习题: {len(mocks)} 题")

    # 3. 保留现有 10 题（标注 legacy）
    print("3. 保留现有旧题库...")
    legacy = []
    try:
        old = json.loads((ROOT / "data" / "processed" / "questions_from_txt.json").read_text(encoding="utf-8"))
        for q in old.get("questions", []):
            q["source"] = "legacy"
            q["subject"] = q.get("subject", "未知")
            legacy.append(q)
        print(f"   旧题库: {len(legacy)} 题")
    except Exception as e:
        print(f"   旧题库读取失败: {e}")

    # 4. 合并所有题目
    all_questions = chem_real + mocks + legacy

    # 5. 统计
    by_subject = {}
    by_source = {}
    for q in all_questions:
        s = q.get("subject", "未知")
        by_subject[s] = by_subject.get(s, 0) + 1
        src = q.get("source", "unknown")
        by_source[src] = by_source.get(src, 0) + 1

    print(f"\n=== 总计: {len(all_questions)} 题 ===")
    print("按科目分布:")
    for s, c in sorted(by_subject.items()):
        print(f"  {s}: {c}")
    print("按来源分布:")
    for s, c in sorted(by_source.items()):
        print(f"  {s}: {c}")

    # 6. 输出
    output = {
        "metadata": {
            "version": "2.0.0",
            "totalQuestions": len(all_questions),
            "lastUpdated": "2026-09-04",
            "sources": [
                "Chemistry Practice (multiple choice questions).docx - 真实试卷",
                "MOCK_QUESTIONS - 基础练习题 (basic_practice)",
                "legacy - 旧题库样本",
                "science-chinese-questions.ts - 理科中文专项 (未合并，独立加载)",
                "arts-chinese-questions.ts - 文科中文专项 (未合并，独立加载)"
            ],
            "stats": {
                "bySubject": by_subject,
                "bySource": by_source
            }
        },
        "questions": all_questions
    }

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n输出: {OUTPUT}")
    print("完成！")


if __name__ == "__main__":
    main()
