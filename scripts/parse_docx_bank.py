"""
批量解析题库文件夹中的 DOCX 文件，提取纯文本写入 data/cleaned_markdown/
用法: python scripts/parse_docx_bank.py
"""
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

BANK_DIR = Path(r"D:\文件\工作室\CSCA-agent-master\题库")
OUTPUT_DIR = Path(r"D:\文件\工作室\CSCA-agent-master\data\cleaned_markdown")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def extract_text_from_docx(docx_path: Path) -> str:
    """从 docx 提取纯文本，保留段落分隔"""
    with zipfile.ZipFile(docx_path, "r") as z:
        with z.open("word/document.xml") as f:
            tree = ET.parse(f)
    root = tree.getroot()
    paragraphs = []
    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        texts = []
        for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
            if t.text:
                texts.append(t.text)
        line = "".join(texts).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def main():
    docx_files = list(BANK_DIR.glob("*.docx")) + list(BANK_DIR.glob("*.doc"))
    print(f"找到 {len(docx_files)} 个 docx/doc 文件")
    success = 0
    for docx in docx_files:
        try:
            if docx.suffix.lower() == ".doc":
                print(f"  跳过(老式 .doc): {docx.name}")
                continue
            text = extract_text_from_docx(docx)
            out_name = docx.stem + ".txt"
            out_path = OUTPUT_DIR / out_name
            out_path.write_text(text, encoding="utf-8")
            print(f"  提取 {docx.name}: {len(text)} 字符, {text.count(chr(10))+1} 段落 -> {out_name}")
            success += 1
        except Exception as e:
            print(f"  失败 {docx.name}: {e}")
    print(f"\n完成: {success}/{len(docx_files)} 成功")
    print(f"输出目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
