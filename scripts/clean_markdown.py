import re
from pathlib import Path

MARKDOWN_DIR = "../data/raw/markdown"

files = list(Path(MARKDOWN_DIR).glob("*.md"))

for file in files:

    text = file.read_text(encoding="utf-8")

    # 统一选项格式
    text = re.sub(r"A、", "A. ", text)
    text = re.sub(r"B、", "B. ", text)
    text = re.sub(r"C、", "C. ", text)
    text = re.sub(r"D、", "D. ", text)

    # 统一答案格式
    text = re.sub(r"【答案】", "答案：", text)

    file.write_text(text, encoding="utf-8")

print("清洗完成")