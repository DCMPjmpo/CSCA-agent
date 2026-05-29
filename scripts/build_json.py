import re
import json
from pathlib import Path
from tqdm import tqdm

# ===================== 你的路径（不用改）=====================
MARKDOWN_DIR = Path(r"D:\文件\工作室\OpenMAIC-main\data\raw_markdown")
OUTPUT_FILE = Path(r"D:\文件\工作室\OpenMAIC-main\data\processed\questions.json")
OUTPUT_FILE.parent.mkdir(exist_ok=True)

# ===================== 通用正则（所有科目试卷都能用）=====================
QUESTION_PATTERN = re.compile(r"(?:^|\n)(\d+)\.\s*(.+?)(?=\n\d+\.|\n[A-D]\.|\nAnswer|\n答案|$)", re.DOTALL | re.MULTILINE)
OPTION_PATTERN = re.compile(r"([A-D])\.\s*(.+)")
ANSWER_PATTERN = re.compile(r"(?:答案|Answer|答)\s*[:：]?\s*([A-D])", re.IGNORECASE)

questions = []
counter = 1

# ===================== 遍历所有 MD 文件（全科目通用）=====================
for md_file in tqdm(list(MARKDOWN_DIR.glob("*.md")), desc="处理所有试卷"):
    try:
        text = md_file.read_text(encoding="utf-8")
    except:
        continue

    # 自动从文件名识别 年份 + 科目
    fname = md_file.stem
    year = 2025
    subject = "unknown"
    
    if "math" in fname.lower() or "数学" in fname:
        subject = "数学"
    elif "phys" in fname.lower() or "物理" in fname:
        subject = "物理"
    elif "chem" in fname.lower() or "化学" in fname:
        subject = "化学"
    elif "chinese" in fname.lower() or "语文" in fname:
        subject = "语文"
    elif "english" in fname.lower() or "英语" in fname:
        subject = "英语"

    # 匹配题目
    for q_num, q_content in QUESTION_PATTERN.findall(text):
        q_content = q_content.strip()
        if len(q_content) < 10:
            continue

        # 提取选项
        options = {k: v.strip() for k, v in OPTION_PATTERN.findall(q_content)}

        # 提取答案
        ans_match = ANSWER_PATTERN.search(q_content)
        answer = ans_match.group(1) if ans_match else ""

        # 清理题目文本
        pure_q = OPTION_PATTERN.sub("", q_content)
        pure_q = ANSWER_PATTERN.sub("", pure_q).strip()

        # 生成标准 JSON（所有科目统一格式）
        questions.append({
            "id": f"q_{counter:06d}",
            "year": year,
            "paper": md_file.stem,
            "subject": subject,
            "type": "single_choice" if options else "subjective",
            "question_number": int(q_num),
            "question": pure_q,
            "options": options,
            "answer": answer,
            "analysis": "",
            "knowledge_points": [],
            "difficulty": None,
            "score": 4,
            "images": [],
            "source_file": md_file.name
        })
        counter += 1

# ===================== 输出最终 JSON =====================
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"\n✅ 全科目处理完成！总题数：{len(questions)}")