#!/usr/bin/env python3
"""
南洋出海局 品牌像素字体 Zpix 子集化脚本（批次 6）

把 Zpix（最像素，全量 ~7MB TTF）裁剪到品牌页实际用到的字符，输出 woff2 供 @font-face 使用。
新增文案后需重新运行本脚本再生成 public/fonts/zpix.woff2。

用法：
  python scripts/subset-zpix.py            # 需先下载 zpix.ttf 到 /tmp 或同目录
  python scripts/subset-zpix.py path/to/zpix.ttf

字符来源：4 个品牌页源码 + lib/i18n/translations.ts + lib/i18n/locales/zh-CN.json
（像素字体只应用在品牌页的成就名称/特殊标签上，其中文品牌词在所有语言界面都以中文显示，
故提取中文资源即可覆盖全部渲染场景。）
"""
import re
import sys
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SOURCE_FILES = [
    ROOT / "app/page.tsx",
    ROOT / "app/csca/page.tsx",
    ROOT / "app/csca-multi-agent/page.tsx",
    ROOT / "app/csca/case-study/page.tsx",
    ROOT / "lib/i18n/translations.ts",
    ROOT / "lib/i18n/locales/zh-CN.json",
]

# 保险：ASCII 可打印字符 + 常见标点（数字/字母/%-+/: 等在像素标签中高频出现）
ASCII_SAFE = "".join(chr(i) for i in range(32, 127))


def collect_chars() -> str:
    chars = set(ASCII_SAFE)
    for path in SOURCE_FILES:
        if not path.exists():
            print(f"  [warn] 缺失 {path.relative_to(ROOT)}")
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for ch in text:
            if ch != "\n" and ch != "\r" and ch != "\t":
                chars.add(ch)
    # 去重并保持稳定排序
    return "".join(sorted(chars))


def main() -> int:
    zpix_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/zpix.ttf"
    zpix_path = Path(zpix_path)
    if not zpix_path.exists():
        print("未找到 zpix.ttf，请先下载：")
        print("  https://github.com/SolidZORO/zpix-pixel-font/releases/download/v3.1.11/zpix.ttf")
        return 1

    from fontTools import subset

    text = collect_chars()
    print(f"字符来源共 {len(SOURCE_FILES)} 个文件，唯一字符 {len(text)} 个")

    out = ROOT / "public/fonts/zpix.woff2"
    options = subset.Options()
    options.flavor = "woff2"
    options.output_file = str(out)
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.notdef_outline = True
    options.recommended_glyphs = True

    font = subset.load_font(str(zpix_path), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    subset.save_font(font, str(out), options)

    size_kb = out.stat().st_size / 1024
    print(f"已生成 {out.relative_to(ROOT)}（{size_kb:.0f} KB）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
