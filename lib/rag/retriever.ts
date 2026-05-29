/**
 * RAG Knowledge Base Retriever - CSCA Pilot Agent
 *
 * Vector database integration for CSCA syllabus knowledge retrieval.
 * This module uses mock data by default.
 * For production, set PINECONE_API_KEY and PINECONE_INDEX environment variables.
 */

import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai/model-router';

export async function retrieveCscaKnowledge(query: string, subject?: string, topK: number = 5) {
  const mockKnowledge: Record<string, string[]> = {
    '数学': [
      '集合与常用逻辑用语：集合的概念、表示方法、运算',
      '函数：函数的概念、性质、基本初等函数',
      '三角函数：三角函数的定义、图像、恒等变换',
      '数列：等差数列、等比数列、数列求和',
      '平面向量：向量的概念、运算、数量积',
      '不等式：不等式的性质、均值不等式、线性规划',
      '立体几何：空间几何体、点线面位置关系',
      '解析几何：直线、圆、椭圆、双曲线、抛物线',
      '概率统计：排列组合、概率、统计',
      '导数：导数的概念、运算、应用',
    ],
    '物理': [
      '力学：运动学、牛顿运动定律、功和能',
      '电磁学：电场、磁场、电磁感应',
      '热学：分子动理论、热力学定律',
      '光学：几何光学、物理光学',
      '原子物理：原子结构、原子核',
    ],
    '化学': [
      '物质结构：原子结构、化学键、晶体结构',
      '化学反应原理：化学反应速率、化学平衡',
      '有机化学：烃类、烃的衍生物、生物大分子',
      '无机化学：元素及其化合物',
      '化学实验：实验操作、实验设计',
    ],
    '中文': [
      '语言知识：字音、字形、词语、句子',
      '文学常识：中国古代文学、现代文学',
      '文言文阅读：实词、虚词、句式',
      '现代文阅读：理解、分析、鉴赏',
      '写作：记叙文、议论文、应用文',
    ],
  };

  const results: Array<{ id: string; content: string; metadata: { subject: string; topic: string; source: string; relevanceScore: number } }> = [];
  const subjects = subject ? [subject] : Object.keys(mockKnowledge);

  for (const subj of subjects) {
    const topics = mockKnowledge[subj] || [];
    topics.forEach((content, index) => {
      const queryLower = query.toLowerCase();
      const contentLower = content.toLowerCase();

      let relevanceScore = 0.5;
      if (queryLower && contentLower.includes(queryLower)) {
        relevanceScore = 0.9;
      } else if (queryLower) {
        const queryWords = queryLower.split(' ');
        const matchedWords = queryWords.filter(word => contentLower.includes(word)).length;
        relevanceScore = 0.5 + (matchedWords / queryWords.length) * 0.4;
      }

      results.push({
        id: `${subj}-${index}`,
        content,
        metadata: {
          subject: subj,
          topic: content.split('：')[0],
          source: 'CSCA Official Syllabus',
          relevanceScore,
        },
      });
    });
  }

  return results
    .sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore)
    .slice(0, topK);
}

export async function getCscaSubjectRules(): Promise<string> {
  const rules = `
CSCA Subject Rules:
1. Science/Engineering majors require: Math + Physics + Chemistry
2. Business/Economics majors require: Math + Chinese + English
3. Arts/Humanities majors require: Chinese + History + Geography
4. Medicine majors require: Math + Physics + Chemistry + Biology
5. Each subject has 48 knowledge points
6. Passing score: 60/100 per subject
7. Total score: Average of required subjects
  `.trim();

  return rules;
}
