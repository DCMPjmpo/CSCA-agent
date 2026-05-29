import json
from collections import Counter

with open(r"D:\文件\工作室\OpenMAIC-main\data\processed\questions.json", "r", encoding="utf-8") as f:
    data = json.load(f)

counter = Counter(item["source_file"] for item in data)
print(f"✅ 总共处理了 {len(counter)} 个文件：")
for file, count in counter.items():
    print(f"  - {file}: {count} 道题")