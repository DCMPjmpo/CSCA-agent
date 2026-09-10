// [TRA-FIX] 新建服务端 API Route，承接客户端的 AI 错题讲解请求，
// [TRA-FIX] 使 AI SDK / model-router 仅在服务端运行，不再进入客户端 bundle。
import { NextRequest, NextResponse } from 'next/server';
import { getAIErrorExplanation } from '@/lib/csca/error-analysis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // [TRA-FIX] 原封不动转发给服务端实现
    const result = await getAIErrorExplanation(
      body.question,
      body.userAnswer,
      body.correctAnswer,
      body.subject,
      body.module,
      body.locale,
    );
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[/api/csca/error-analysis] Error:', error);
    return NextResponse.json({ error: '分析失败' }, { status: 500 });
  }
}
