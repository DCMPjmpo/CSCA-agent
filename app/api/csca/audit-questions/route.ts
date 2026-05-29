/**
 * CSCA题库审核API
 * 用于检查题库中题目的质量
 */

import { NextResponse } from 'next/server';
import { getExamQuestions, getAllSubjects } from '@/lib/csca/question-bank';
import { auditQuestions, auditQuestion, fixQuestion, AuditResult } from '@/lib/csca/question-auditor';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 获取题目
    const subjects = subject ? [subject] : getAllSubjects();
    const questions = getExamQuestions(subjects, limit);

    // 审核题目
    const { validQuestions, invalidQuestions, stats } = auditQuestions(questions);

    // 获取详细的审核结果
    const detailedResults = questions.map(q => {
      const audit = auditQuestion(q);
      const fixed = fixQuestion(q);
      return {
        id: q.id,
        question: q.question,
        fixedQuestion: fixed.question,
        isValid: audit.isValid,
        issues: audit.issues,
        confidence: audit.confidence,
        suggestion: audit.suggestion,
        module: q.partTitle,
        subject: q.subject,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats,
        validQuestions: validQuestions.length,
        invalidQuestions: invalidQuestions.length,
        detailedResults,
      },
    });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({
      success: false,
      error: '审核失败',
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questions, action } = body;

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({
        success: false,
        error: '请提供题目数据',
      });
    }

    if (action === 'audit') {
      // 审核题目
      const { validQuestions, invalidQuestions, stats, auditResults } = auditQuestions(questions);
      return NextResponse.json({
        success: true,
        data: {
          stats,
          validQuestions,
          invalidQuestions,
          auditResults,
        },
      });
    } else if (action === 'fix') {
      // 修复题目
      const fixedQuestions = questions.map(q => fixQuestion(q));
      return NextResponse.json({
        success: true,
        data: {
          fixedQuestions,
        },
      });
    } else if (action === 'audit_and_fix') {
      // 审核并修复
      const { validQuestions, invalidQuestions, stats, auditResults } = auditQuestions(questions);
      const fixedQuestions = questions.map(q => ({
        ...q,
        fixed: fixQuestion(q),
        audit: auditQuestion(q),
      }));
      return NextResponse.json({
        success: true,
        data: {
          stats,
          validQuestions,
          invalidQuestions,
          auditResults,
          fixedQuestions,
        },
      });
    }

    return NextResponse.json({
      success: false,
      error: '未知操作',
    });
  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({
      success: false,
      error: '处理失败',
    });
  }
}
