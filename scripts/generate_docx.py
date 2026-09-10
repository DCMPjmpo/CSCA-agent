"""
CSCA Pilot Agent — 专业项目介绍 Word 文档生成器
基于 python-docx 生成大厂级格式化文档
"""

from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import os

# ============================================================
# 颜色定义（南洋档案局主题色）
# ============================================================
COLOR_PRIMARY = RGBColor(0x2D, 0x5A, 0x4A)      # 深松绿
COLOR_ACCENT = RGBColor(0xA6, 0x8B, 0x5B)        # 氧化黄铜
COLOR_DARK = RGBColor(0x1A, 0x1A, 0x1A)          # 近黑
COLOR_BODY = RGBColor(0x33, 0x33, 0x33)          # 正文灰
COLOR_MUTED = RGBColor(0x8B, 0x69, 0x14)         # 暗金
COLOR_TABLE_HEADER_BG = "2D5A4A"                  # 表头背景（深松绿）
COLOR_TABLE_ROW_ALT = "F0EDE5"                    # 斑马行背景
COLOR_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
COLOR_CODE_BG = "F5F2EC"                          # 代码块背景

# ============================================================
# 字体定义
# ============================================================
FONT_TITLE_CN = "微软雅黑"
FONT_TITLE_EN = "Calibri"
FONT_BODY_CN = "宋体"
FONT_BODY_EN = "Calibri"
FONT_CODE = "Consolas"

# ============================================================
# 文档初始化
# ============================================================
doc = Document()

# 页面设置
for section in doc.sections:
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

# 默认样式
style_normal = doc.styles['Normal']
style_normal.font.name = FONT_BODY_EN
style_normal.font.size = Pt(11)
style_normal.font.color.rgb = COLOR_BODY
style_normal.paragraph_format.space_after = Pt(6)
style_normal.paragraph_format.line_spacing = 1.5
# 设置中文字体
style_normal.element.rPr.rFonts.set(qn('w:eastAsia'), FONT_BODY_CN)


# ============================================================
# 工具函数
# ============================================================
def set_cell_shading(cell, color_hex):
    """设置单元格背景色"""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_borders(cell, color="A68B5B", size="6"):
    """设置单元格边框"""
    border_xml = f'''
    <w:tcBorders {nsdecls("w")}>
        <w:top w:val="single" w:sz="{size}" w:color="{color}"/>
        <w:left w:val="single" w:sz="{size}" w:color="{color}"/>
        <w:bottom w:val="single" w:sz="{size}" w:color="{color}"/>
        <w:right w:val="single" w:sz="{size}" w:color="{color}"/>
    </w:tcBorders>
    '''
    cell._tc.get_or_add_tcPr().append(parse_xml(border_xml))


def add_page_break():
    """插入分页符"""
    doc.add_page_break()


def set_paragraph_border(paragraph, color="A68B5B", size="12", position="bottom"):
    """设置段落边框"""
    p = paragraph._p
    pPr = p.get_or_add_pPr()
    border_xml = f'''
    <w:pBdr {nsdecls("w")}>
        <w:{position} w:val="single" w:sz="{size}" w:space="4" w:color="{color}"/>
    </w:pBdr>
    '''
    pPr.append(parse_xml(border_xml))


def add_run(paragraph, text, font_name=None, font_name_cn=None, size=11,
            bold=False, color=None, italic=False):
    """添加文本 run"""
    run = paragraph.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    if font_name:
        run.font.name = font_name
        run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name_cn or font_name)
    else:
        run.font.name = FONT_BODY_EN
        run._element.rPr.rFonts.set(qn('w:eastAsia'), FONT_BODY_CN)
    return run


def add_heading_custom(text, level=1, color=None):
    """添加自定义标题"""
    if color is None:
        color = COLOR_PRIMARY

    if level == 0:
        # 文档主标题
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(24)
        p.paragraph_format.space_after = Pt(12)
        add_run(p, text, font_name=FONT_TITLE_EN, font_name_cn=FONT_TITLE_CN,
                size=26, bold=True, color=color)
        return p

    sizes = {1: 18, 2: 15, 3: 13, 4: 12}
    size = sizes.get(level, 12)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18 if level <= 2 else 12)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True

    if level == 1:
        set_paragraph_border(p, color="2D5A4A", size="16", position="bottom")

    add_run(p, text, font_name=FONT_TITLE_EN, font_name_cn=FONT_TITLE_CN,
            size=size, bold=True, color=color)
    return p


def add_body_paragraph(text, bold=False, color=None, indent=False):
    """添加正文段落"""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    if indent:
        p.paragraph_format.first_line_indent = Cm(0.74)
    add_run(p, text, size=11, bold=bold, color=color)
    return p


def add_bullet(text, level=0):
    """添加项目符号"""
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.4
    add_run(p, text, size=11)
    return p


def add_code_block(lines):
    """添加代码块"""
    for line in lines:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Cm(1.0)
        run = p.add_run(line)
        run.font.name = FONT_CODE
        run.font.size = Pt(9.5)
        run.font.color.rgb = COLOR_PRIMARY
        # 设置背景色
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{COLOR_CODE_BG}"/>')
        p._p.get_or_add_pPr().append(shading)


def add_table_from_data(headers, rows, col_widths=None):
    """从数据创建格式化表格"""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    # 表头
    header_row = table.rows[0]
    header_row.height = Cm(0.8)
    for i, header in enumerate(headers):
        cell = header_row.cells[i]
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(cell, COLOR_TABLE_HEADER_BG)
        set_cell_borders(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        add_run(p, header, font_name=FONT_TITLE_EN, font_name_cn=FONT_TITLE_CN,
                size=10.5, bold=True, color=COLOR_WHITE)

    # 数据行
    for row_idx, row_data in enumerate(rows):
        row = table.rows[row_idx + 1]
        for col_idx, cell_data in enumerate(row_data):
            cell = row.cells[col_idx]
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_borders(cell)
            # 斑马纹
            if row_idx % 2 == 1:
                set_cell_shading(cell, COLOR_TABLE_ROW_ALT)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.25
            add_run(p, str(cell_data), size=10, color=COLOR_BODY)

    return table


def add_quote_block(text):
    """添加引用块"""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(1.0)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.4
    # 左边框
    border_xml = f'''
    <w:pBdr {nsdecls("w")}>
        <w:left w:val="single" w:sz="24" w:space="8" w:color="A68B5B"/>
    </w:pBdr>
    '''
    p._p.get_or_add_pPr().append(parse_xml(border_xml))
    add_run(p, text, size=11, italic=True, color=COLOR_MUTED)
    return p


# ============================================================
# 封面
# ============================================================
# 空行留白
for _ in range(6):
    doc.add_paragraph()

# 主标题
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(4)
add_run(p, "CSCA Pilot Agent", font_name=FONT_TITLE_EN, size=36, bold=True, color=COLOR_PRIMARY)

# 副标题
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(20)
add_run(p, "南洋档案局 · 东盟来华留学生智能备考平台", font_name_cn=FONT_TITLE_CN, size=16, bold=True, color=COLOR_ACCENT)

# 分隔线
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_paragraph_border(p, color="A68B5B", size="12", position="bottom")
p.paragraph_format.space_after = Pt(20)

# 描述
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(40)
add_run(p, "面向东盟十国来华留学生的全链路 AI 智能备考系统", size=12, color=COLOR_BODY)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_after = Pt(60)
add_run(p, "基于多智能体协同架构，覆盖从学情诊断到院校匹配的完整备考闭环", size=12, color=COLOR_MUTED, italic=True)

# 版本信息表
info_table = doc.add_table(rows=5, cols=2)
info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
info_data = [
    ("项目定位", "东盟来华留学生 CSCA 考试全流程自主智能体"),
    ("技术基座", "Next.js 16 + React 19 + TypeScript 5 + LangGraph 1.1"),
    ("AI 架构", "多模型智能路由 + 8 专家智能体协同 + GMI 云推理引擎"),
    ("多语言支持", "14 种语言（覆盖东盟十国 + 中英日俄阿拉伯）"),
    ("版本 / 协议", "v0.2.1 / AGPL-3.0"),
]
for i, (k, v) in enumerate(info_data):
    row = info_table.rows[i]
    row.height = Cm(0.7)
    cell_k = row.cells[0]
    cell_v = row.cells[1]
    cell_k.width = Cm(4)
    cell_v.width = Cm(10)

    set_cell_shading(cell_k, "081B24")
    set_cell_shading(cell_v, "F5F2EC")
    set_cell_borders(cell_k, color="A68B5B")
    set_cell_borders(cell_v, color="A68B5B")

    p_k = cell_k.paragraphs[0]
    p_k.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_k.paragraph_format.space_before = Pt(2)
    p_k.paragraph_format.space_after = Pt(2)
    add_run(p_k, k, font_name_cn=FONT_TITLE_CN, size=10, bold=True, color=COLOR_WHITE)

    p_v = cell_v.paragraphs[0]
    p_v.paragraph_format.space_before = Pt(2)
    p_v.paragraph_format.space_after = Pt(2)
    p_v.paragraph_format.left_indent = Cm(0.3)
    add_run(p_v, v, size=10, color=COLOR_BODY)

add_page_break()

# ============================================================
# 一、项目背景
# ============================================================
add_heading_custom("一、项目背景", level=1)

add_heading_custom("1.1 行业痛点", level=2)
add_body_paragraph("当前东盟来华留学生面临三大核心痛点：", indent=True)

add_bullet('备考资料零散 — CSCA（Chinese Standardized Competency Assessment）备考资源分散在各处，缺乏统一入口和系统化组织。')
add_bullet('缺乏自适应学习路径 — 留学生基础差异大，传统"一刀切"式学习方案效率低下，无法精准定位薄弱环节。')
add_bullet('院校与奖学金信息获取困难 — 中国高校招生政策和奖学金项目信息分散，留学生难以高效匹配适合的院校。')

add_heading_custom("1.2 解决方案", level=2)
add_body_paragraph(
    "CSCA Pilot Agent 构建了一套全链路自主工作流，通过 8 个专业智能体协同运作，"
    "覆盖从入学评估到升学匹配的完整备考生命周期，为东盟留学生提供一站式智能化备考服务。",
    indent=True
)

add_page_break()

# ============================================================
# 二、系统架构
# ============================================================
add_heading_custom("二、系统架构", level=1)

add_heading_custom("2.1 整体架构", level=2)
add_body_paragraph("系统采用四层分离架构，确保各层职责清晰、独立演进：")

add_code_block([
    "┌─────────────────────────────────────────────────────────┐",
    "│                    表现层 (Presentation)                   │",
    "│  Next.js App Router · React 19 · Tailwind CSS 4         │",
    "│  南洋档案局主题 · 14 语种 i18n · 响应式布局              │",
    "├─────────────────────────────────────────────────────────┤",
    "│                    接口层 (API Gateway)                    │",
    "│  /api/csca/*  ·  /api/chat  ·  /api/generate/*          │",
    "│  SSE 流式响应 · 心跳保活 · SSRF 防护                      │",
    "├─────────────────────────────────────────────────────────┤",
    "│                    编排层 (Orchestration)                  │",
    "│  LangGraph StateGraph · 多智能体 Director 图              │",
    "│  无状态生成器 · Partial-JSON 流式解析                     │",
    "├─────────────────────────────────────────────────────────┤",
    "│                    推理层 (AI Inference)                   │",
    "│  GMI 云推理引擎 · 16+ Provider 统一抽象                   │",
    "│  智能模型路由 · 故障降级 · Mock 回退                      │",
    "└─────────────────────────────────────────────────────────┘",
])

add_heading_custom("2.2 核心模块", level=2)

add_heading_custom("AI 推理引擎 (lib/ai/)", level=3)
add_table_from_data(
    ["模块", "职责"],
    [
        ["providers.ts", "统一 Provider 注册表，管理 16+ AI 服务商配置"],
        ["model-router.ts", "任务级智能路由器，支持三级容灾降级"],
        ["llm.ts", "统一 LLM 调用层，封装 callLLM / streamLLM"],
        ["thinking-config.ts", "深度思考模式配置，支持三种控制策略"],
        ["thinking-context.ts", "基于 AsyncLocalStorage 的思考上下文传递"],
    ]
)

doc.add_paragraph()
add_heading_custom("多智能体编排 (lib/orchestration/)", level=3)
add_table_from_data(
    ["模块", "职责"],
    [
        ["stateless-generate.ts", "无状态生成器，解析 LLM 结构化 JSON Array"],
        ["director-graph.ts", "LangGraph StateGraph 导演图，决策发言顺序"],
        ["ai-sdk-adapter.ts", "LangChain 兼容适配器，包装 AI SDK LanguageModel"],
        ["csca-workflow.ts", "CSCA 备考工作流定义"],
        ["prompt-builder.ts", "多智能体提示词构建器"],
    ]
)

doc.add_paragraph()
add_heading_custom("CSCA 业务核心 (lib/csca/)", level=3)
add_table_from_data(
    ["模块", "职责"],
    [
        ["agents.ts", "8 个 CSCA 专家智能体定义"],
        ["multi-agent-orchestration.ts", "关键词快速选择 + 流式响应编排"],
        ["diagnosis.ts", "学情诊断引擎"],
        ["knowledge-data.ts", "CSCA 学科知识体系数据"],
        ["question-bank.ts", "题库管理与题目生成"],
        ["error-analysis.ts", "错题分析与薄弱点诊断"],
        ["university-database.ts", "中国高校与奖学金数据库"],
        ["workflow-runner.ts", "全链路备考工作流执行器"],
    ]
)

add_heading_custom("2.3 技术栈", level=2)
add_table_from_data(
    ["分类", "技术", "版本"],
    [
        ["框架", "Next.js", "16.1.2"],
        ["前端", "React", "19.2.3"],
        ["语言", "TypeScript", "5.x"],
        ["AI SDK", "Vercel AI SDK", "6.0.168"],
        ["多智能体", "LangGraph", "1.1.1"],
        ["状态管理", "Zustand", "5.0.10"],
        ["样式", "Tailwind CSS", "4.x"],
        ["国际化", "i18next", "26.0.1"],
        ["图表", "ECharts", "6.0.0"],
        ["流程图", "XYFlow", "12.10.0"],
        ["富文本", "ProseMirror", "1.x"],
        ["数学渲染", "KaTeX / Temml", "0.16 / 0.13"],
        ["PDF 解析", "unpdf", "1.4.0"],
        ["测试", "Vitest + Playwright", "4.1 / 1.58"],
        ["包管理", "pnpm", "10.28"],
    ]
)

add_page_break()

# ============================================================
# 三、多智能体系统
# ============================================================
add_heading_custom("三、多智能体系统", level=1)

add_heading_custom("3.1 智能体阵容", level=2)
add_body_paragraph("CSCA Pilot Agent 部署了 8 个专业化智能体，各司其职、协同运作：")

add_table_from_data(
    ["智能体", "角色定位", "核心职责", "路由模型"],
    [
        ["CSCA Examiner", "考试协调官", "模拟出题、答题评估、错题讲解、难度调整", "DeepSeek"],
        ["CSCA Tutor", "学习辅导师", "知识点拆解、概念讲解、学习路径规划", "Qwen"],
        ["CSCA Analyst", "成绩分析师", "成绩深度分析、薄弱点识别、改进策略", "Kimi"],
        ["CSCA Challenger", "批判训练师", "批判性思维训练、多路径问题挑战", "DeepSeek"],
        ["CSCA Advisor", "升学顾问", "大学/奖学金匹配、职业路径规划", "Kimi"],
        ["CSCA Motivator", "学习激励师", "学习动力维持、成就庆祝、心态调节", "Qwen"],
        ["Video Explainer", "视频讲解师", "AI 视频讲解脚本生成", "Qwen"],
        ["Error Explainer", "错题讲解专家", "错题归因、知识盲区定位、针对性练习", "DeepSeek"],
    ]
)

doc.add_paragraph()
add_heading_custom("3.2 协同机制", level=2)
add_body_paragraph("系统采用关键词驱动的快速选择 + LangGraph 导演图编排骨双层机制：")
add_bullet("快速选择层 — 基于关键词匹配，零延迟选择最优 Agent 响应用户请求")
add_bullet("导演图编排层 — LangGraph StateGraph 管理多 Agent 对话流，决策发言顺序与动作执行")
add_bullet("流式响应层 — SSE (Server-Sent Events) 实时推送，支持 Partial-JSON 增量解析")

doc.add_paragraph()
add_heading_custom("3.3 模型路由策略", level=2)
add_body_paragraph("按任务类型（TaskType）智能分配最优模型：")
add_code_block([
    "TaskType          → GMI 优先模型     → 降级模型",
    "─────────────────────────────────────────────",
    "diagnosis         → DeepSeek V4 Pro → deepseek-chat",
    "knowledge_map     → Qwen3.6 Max     → deepseek-chat",
    "exercise_gen      → Qwen3.6 Max     → deepseek-chat",
    "mock_exam         → DeepSeek V4 Pro → deepseek-chat",
    "score_analysis    → Kimi K2.5       → deepseek-chat",
    "university_match  → Kimi K2.5       → deepseek-chat",
    "translation       → Qwen3.6 Max     → deepseek-chat",
    "tutor             → DeepSeek V4 Pro → deepseek-chat",
])

add_page_break()

# ============================================================
# 四、核心功能
# ============================================================
add_heading_custom("四、核心功能", level=1)

add_heading_custom("4.1 完整备考工作流", level=2)
add_code_block([
    "学情诊断 → 知识图谱 → 自适应学习 → 专项模考 → 成绩分析 → 错题回顾 → 学习规划 → 院校匹配",
])

doc.add_paragraph()
add_table_from_data(
    ["功能模块", "描述"],
    [
        ["学情诊断", "智能评估学习水平和薄弱环节，生成结构化诊断报告"],
        ["知识图谱", "构建学科知识体系和考点关联网络，可视化呈现"],
        ["自适应学习", "根据诊断结果定制个性化学习路径和练习计划"],
        ["专项模考", "模拟真实 CSCA 考试环境，支持全真模式和练习模式"],
        ["成绩分析", "深度分析答题情况，输出改进建议"],
        ["错题回顾", "错题归因分析，定位知识盲区，推荐针对性练习"],
        ["学习规划", "生成全周期备考路线图"],
        ["院校匹配", "根据成绩和个人偏好精准匹配中国高校和奖学金项目"],
    ]
)

add_heading_custom("4.2 多模态 AI 能力矩阵", level=2)
add_body_paragraph('除核心 LLM 对话能力外，系统集成丰富的多模态 AI 服务，构建全感官学习体验：')

add_table_from_data(
    ["能力维度", "支持引擎", "应用场景"],
    [
        ["语音合成 (TTS)", "OpenAI TTS、Azure、GLM、Qwen、VoxCPM、Doubao、ElevenLabs、MiniMax、Lemonade", "知识点朗读、听力训练、发音纠正"],
        ["语音识别 (ASR)", "OpenAI Whisper、Qwen ASR、Lemonade ASR", "口语练习、语音答题、实时转写"],
        ["图像生成", "Seedream、OpenAI DALL-E、Qwen-Image、Nano Banana、MiniMax、Grok、Lemonade", "教学插图、概念可视化、记忆辅助"],
        ["视频生成", "Seedance、Kling、Veo、Sora、MiniMAX、Grok、HappyHorse", "视频讲解、动态演示、沉浸式课堂"],
        ["PDF 解析", "unpdf、MinerU、MinerU Cloud", "教材解析、论文阅读、资料提取"],
        ["网络搜索", "Tavily、Bocha、Brave、Baidu", "实时资讯、院校动态、政策更新"],
        ["课堂生成", "AI 驱动互动课堂引擎", "情境模拟、互动练习、角色扮演"],
    ]
)

add_heading_custom("4.3 国际化体系", level=2)
add_body_paragraph("支持 14 种语言，覆盖东盟十国全部官方语言：")

add_table_from_data(
    ["语言", "代码", "适用国家"],
    [
        ["简体中文", "zh-CN", "中国"],
        ["繁體中文", "zh-TW", "中国台湾"],
        ["English", "en-US", "国际通用"],
        ["ไทย", "th-TH", "泰国"],
        ["Tiếng Việt", "vi-VN", "越南"],
        ["Bahasa Indonesia", "id-ID", "印度尼西亚"],
        ["Bahasa Malaysia", "ms-MY", "马来西亚"],
        ["Filipino", "tl-PH", "菲律宾"],
        ["မြန်မာဘာသာ", "my-MM", "缅甸"],
        ["ភាសាខ្មែរ", "km-KH", "柬埔寨"],
        ["ພາສາລາວ", "lo-LA", "老挝"],
        ["日本語", "ja-JP", "日本"],
        ["Русский", "ru-RU", "俄罗斯"],
        ["العربية", "ar-SA", "阿拉伯地区"],
    ]
)

add_page_break()

# ============================================================
# 五、页面路由
# ============================================================
add_heading_custom("五、页面路由", level=1)

add_heading_custom("5.1 用户页面", level=2)
add_table_from_data(
    ["路由", "页面", "功能"],
    [
        ["/", "首页", "品牌展示、南洋档案局沉浸式主题"],
        ["/csca", "CSCA 备考中心", "学情诊断、知识图谱、自适应学习、模考"],
        ["/csca/audit", "题目审核", "AI 题目质量审核"],
        ["/csca/case-study", "案例学习", "成功上岸案例展示"],
        ["/csca-multi-agent", "议事厅", "多智能体对话界面，支持 @提及、流式响应"],
        ["/brand/advisors", "上岸故事", "留学生成功案例展示"],
        ["/classroom/:id", "课堂", "AI 生成的互动课堂"],
        ["/generation-preview", "预览", "内容生成预览"],
    ]
)

doc.add_paragraph()
add_heading_custom("5.2 API 路由", level=2)
add_table_from_data(
    ["分类", "端点"],
    [
        ["CSCA 业务", "/api/csca/diagnosis、knowledge-map、adaptive-learning、mock-exam、score-analysis、error-analysis、ask-tutor、university-match、multi-agent、workflow、audit-questions"],
        ["通用 AI", "/api/chat、/api/generate/tts、image、video、scene-*、agent-profiles"],
        ["文档与搜索", "/api/parse-pdf、/api/web-search、/api/quiz-grade"],
        ["课堂", "/api/classroom、/api/generate-classroom、/api/classroom-media/*"],
        ["系统", "/api/health、/api/server-providers、/api/verify-model、/api/access-code/*"],
    ]
)

add_page_break()

# ============================================================
# 六、容灾与可靠性
# ============================================================
add_heading_custom("六、容灾与可靠性", level=1)

add_heading_custom("6.1 三级降级机制", level=2)
add_body_paragraph("系统设计了完整的三级容灾链路，确保服务高可用：")

add_code_block([
    "GMI 云推理引擎 (优先)",
    "    │ 失败降级",
    "    ▼",
    "DashScope / SiliconFlow (二级)",
    "    │ 失败降级",
    "    ▼",
    "Mock 流式回退 (兜底)",
])

add_bullet("GMI 优先：优先调用 GMI 平台（DeepSeek V4 Pro / Qwen3.6 Max / Kimi K2.5）")
add_bullet("二级降级：GMI 不可用时自动切换至 DashScope 或 SiliconFlow")
add_bullet("Mock 兜底：所有 API 均不可用时，根据用户提问内容生成模拟流式回复，保障用户体验不中断")

add_heading_custom("6.2 流式可靠性", level=2)
add_bullet("SSE 心跳保活：每 15 秒发送 heartbeat 注释，防止代理/浏览器关闭空闲连接")
add_bullet("Partial-JSON 解析：支持不完整 JSON 的增量解析，实时推送已完成的数组元素")
add_bullet("Abort 传播：客户端中断请求时通过 req.signal 传播至 LLM 调用链")
add_bullet("超时保护：60 秒超时限制，防止长时间阻塞")

add_heading_custom("6.3 安全防护", level=2)
add_bullet("SSRF 防护：生产环境下对客户端提供的 Base URL 进行 SSRF 校验")
add_bullet("密钥隔离：API Key 仅在服务端解析，不暴露给客户端")
add_bullet("访问控制：可选站点密码保护 (ACCESS_CODE)")
add_bullet("Provider 验证：支持模型、图像、PDF、视频 Provider 的可用性验证")

add_page_break()

# ============================================================
# 七、设计主题
# ============================================================
add_heading_custom("七、设计主题", level=1)

add_heading_custom("7.1 南洋档案局", level=2)
add_body_paragraph('项目采用"南洋档案局"沉浸式主题设计，将现代 AI 技术与南洋华侨历史文脉融合：')

add_table_from_data(
    ["视觉元素", "设计语言"],
    [
        ["主色调", "深松绿 #2D5A4A + 氧化黄铜 #A68B5B + 宣纸白 #FAF5EC"],
        ["背景色", "深青黑 #081B24 + 深棕 #3D2817"],
        ["字体", "衬线体（标题）+ 等宽体（英文）+ 像素体（装饰）"],
        ["圆角", "全局零圆角，直角档案签风格"],
        ["阴影", "偏移阴影 Npx Npx 0 #020b10，模拟印章/刻印效果"],
        ["交互反馈", "hover 上浮 + 深松绿高亮 + 黄铜边框加亮"],
    ]
)

add_heading_custom("7.2 沉浸式组件", level=2)
add_bullet("航海沙盘 — 首页交互式南洋航海地图，据点探索式导航")
add_bullet("竹简导航 — 左侧边栏竹简卷轴风格")
add_bullet("奏折输入 — 议事厅底部奏折式传令栏")
add_bullet("印章按钮 — 传令按钮采用印章视觉设计")
add_bullet("花名册抽屉 — 右侧竹简抽屉展示智能体阵容")

add_page_break()

# ============================================================
# 八、项目结构
# ============================================================
add_heading_custom("八、项目结构", level=1)

add_code_block([
    "CSCA-agent-master/",
    "├── app/                              # Next.js App Router",
    "│   ├── api/                          # 服务端 API 路由",
    "│   │   ├── csca/                     # CSCA 业务接口（11 个端点）",
    "│   │   ├── chat/                     # 通用对话接口",
    "│   │   ├── generate/                 # AI 生成接口",
    "│   │   ├── parse-pdf/                # PDF 解析",
    "│   │   └── web-search/               # 网络搜索",
    "│   ├── csca/                         # CSCA 备考中心页面",
    "│   ├── csca-multi-agent/             # 议事厅（多智能体对话）",
    "│   ├── brand/                        # 品牌页面（上岸故事）",
    "│   ├── classroom/                    # 课堂页面",
    "│   └── page.tsx                      # 首页",
    "├── lib/                              # 核心业务逻辑",
    "│   ├── ai/                           # AI 推理引擎",
    "│   ├── csca/                         # CSCA 业务核心",
    "│   ├── orchestration/                # 多智能体编排",
    "│   ├── i18n/                         # 国际化（14 种语言）",
    "│   ├── server/                       # 服务端工具",
    "│   ├── store/                        # Zustand 状态管理",
    "│   └── utils/                        # 工具函数",
    "├── components/                       # React UI 组件",
    "│   ├── brand/                        # 品牌主题组件",
    "│   ├── csca/                         # CSCA 功能组件",
    "│   ├── ai-elements/                  # AI 交互基础元素",
    "│   ├── settings/                     # 设置面板",
    "│   └── ui/                           # 通用 UI 组件库",
    "├── packages/                         # 内部工作区包",
    "│   ├── mathml2omml/                  # 数学公式转换",
    "│   └── pptxgenjs/                    # PPT 生成",
    "├── tests/                            # 单元测试 (Vitest)",
    "├── e2e/                              # 端到端测试 (Playwright)",
    "└── .env.local                        # 环境变量配置",
])

add_page_break()

# ============================================================
# 九、快速开始
# ============================================================
add_heading_custom("九、快速开始", level=1)

add_heading_custom("9.1 环境要求", level=2)
add_bullet("Node.js >= 20.9.0")
add_bullet("pnpm >= 10")

add_heading_custom("9.2 安装", level=2)
add_code_block([
    "git clone https://github.com/Chen-Taos/CSCA-agent-master.git",
    "cd CSCA-agent-master",
    "pnpm install",
])

add_heading_custom("9.3 配置", level=2)
add_code_block([
    "cp .env.example .env.local",
    "",
    "# .env.local 中配置至少一个 LLM 服务商密钥：",
    "DEFAULT_MODEL=deepseek:deepseek-v4-pro",
    "DEEPSEEK_API_KEY=sk-your-deepseek-api-key",
    "",
    "# CSCA 多智能体模型路由",
    "GMI_API_BASE=https://api.deepseek.com/v1",
    "QWEN_MODEL=deepseek-v4-pro",
    "DEEPSEEK_MODEL=deepseek-v4-pro",
    "KIMI_MODEL=deepseek-v4-pro",
])

add_heading_custom("9.4 运行", level=2)
add_code_block([
    "pnpm dev          # 开发模式",
    "pnpm build        # 生产构建",
    "pnpm start        # 生产启动",
    "pnpm lint         # 代码检查",
    "pnpm test          # 单元测试",
    "pnpm test:e2e     # 端到端测试",
])

add_page_break()

# ============================================================
# 十、部署
# ============================================================
add_heading_custom("十、部署", level=1)

add_heading_custom("10.1 Vercel 部署", level=2)
add_bullet("Fork 本仓库")
add_bullet("导入至 Vercel")
add_bullet("配置环境变量（至少一个 LLM API 密钥）")
add_bullet("部署")

add_heading_custom("10.2 Docker 部署", level=2)
add_code_block([
    "cp .env.example .env.local",
    "# 编辑 .env.local 配置 API 密钥",
    "docker compose up --build",
])

add_page_break()

# ============================================================
# 十一、测试与质量
# ============================================================
add_heading_custom("十一、测试与质量", level=1)

add_table_from_data(
    ["测试类型", "工具", "覆盖范围"],
    [
        ["单元测试", "Vitest 4.1", "AI Provider 配置、Thinking 配置、Web Search 路由"],
        ["端到端测试", "Playwright 1.58", "关键用户流程、多语言切换、响应式布局"],
        ["国际化检查", "自研脚本", "翻译 Key 完整性校验"],
        ["代码格式化", "Prettier 3.8", "统一代码风格"],
        ["静态检查", "ESLint 9 + TypeScript 5", "类型安全与代码规范"],
    ]
)

add_page_break()

# ============================================================
# 十二、项目信息
# ============================================================
add_heading_custom("十二、项目信息", level=1)

add_table_from_data(
    ["项目", "信息"],
    [
        ["项目名称", "CSCA Pilot Agent"],
        ["底层框架", "OpenMAIC (AGPL-3.0)"],
        ["代码仓库", "github.com/Chen-Taos/CSCA-agent-master"],
        ["开源协议", "AGPL-3.0"],
        ["联系方式", "csca-support@gmi-cloud.com"],
    ]
)

# 结尾
doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.paragraph_format.space_before = Pt(30)
set_paragraph_border(p, color="A68B5B", size="12", position="top")
add_run(p, "CSCA Pilot Agent — 以 AI 之力，连接南洋学子与中国学府",
        font_name_cn=FONT_TITLE_CN, size=13, bold=True, color=COLOR_PRIMARY)


# ============================================================
# 保存文档
# ============================================================
output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "CSCA_Pilot_Agent_项目介绍.docx")
doc.save(output_path)
print(f"文档已生成：{output_path}")
print(f"文件大小：{os.path.getsize(output_path) / 1024:.1f} KB")
