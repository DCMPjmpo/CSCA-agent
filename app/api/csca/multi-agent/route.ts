/**
 * CSCA Multi-Agent Chat API
 * 
 * Optimized for speed with streaming support
 */

import { NextResponse } from 'next/server';
import { runCscaMultiAgent, runCscaMultiAgentStream } from '@/lib/csca/multi-agent-orchestration';
import { CSCA_AGENTS, getAgentById } from '@/lib/csca/agents';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, messages = [], stream = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Streaming mode - faster response
    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream response
            for await (const chunk of runCscaMultiAgentStream(message, messages)) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify(chunk)}\n\n`
                )
              );
            }
            controller.close();
          } catch (error) {
            console.error('[CSCA Multi-Agent Stream] Error:', error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  error: 'Stream error',
                })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode
    const result = await runCscaMultiAgent(message, messages);

    const assistantMessages = result.messages.filter(
      (m: any) => m.role === 'assistant' && m.agentId
    );

    return NextResponse.json({
      success: true,
      messages: assistantMessages,
      agents: CSCA_AGENTS,
    });
  } catch (error) {
    console.error('[CSCA Multi-Agent API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
