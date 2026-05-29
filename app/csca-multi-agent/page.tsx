'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Send, Sparkles, GraduationCap } from 'lucide-react';
import { CSCA_AGENTS, getAgentById } from '@/lib/csca/agents';
import { useTranslation } from '@/lib/i18n/hooks';
import { CscaLanguageSwitcher } from '@/components/csca/CscaLanguageSwitcher';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  timestamp: Date | number;
}

export default function CscaMultiAgentPage() {
  const { locale, t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to CSCA Multi-Agent Prep! 👋 I have 6 specialized agents ready to help you. Ask me anything about your exam prep!',
      agentId: 'system',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (ts: Date | number) => {
    if (!mounted) return '';
    const date = typeof ts === 'number' ? new Date(ts) : ts;
    return date.toLocaleTimeString();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Generate a unique ID for the assistant message
    const assistantMessageId = `${Date.now()}-assistant`;

    // Add a placeholder message that will be updated with streaming content
    setMessages((prev) => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agentId: 'system',
      timestamp: Date.now(),
    }]);

    try {
      // Use streaming for faster response
      const response = await fetch('/api/csca/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          messages: [...messages, userMessage].map(({ role, content, agentId }) => ({
            role,
            content,
            agentId,
          })),
          locale,
          stream: true, // Enable streaming
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;

          const dataMatch = event.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          try {
            const chunk = JSON.parse(dataMatch[1]);

            if (chunk.type === 'chunk') {
              // Update the streaming message
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: chunk.data.fullContent, agentId: chunk.data.agentId }
                  : msg
              ));
            } else if (chunk.type === 'complete') {
              // Final update with cleaned content
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: chunk.data.content, agentId: chunk.data.agentId }
                  : msg
              ));
            } else if (chunk.type === 'error') {
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: chunk.data.message, agentId: 'system' }
                  : msg
              ));
            }
          } catch (parseError) {
            console.error('Error parsing SSE chunk:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Update the placeholder message with error content
      setMessages((prev) => prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Sorry, there was an error. Please try again.', agentId: 'system' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgentMention = (agentId: string) => {
    const agent = getAgentById(agentId);
    if (agent) {
      setInput((prev) => `${prev}@${agent.name} `);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-[#09090b]">
      {/* Background Effect */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent)',
        }}
      />

      {/* Sidebar - Agent Panel */}
      <div className="relative w-80 bg-zinc-900/80 backdrop-blur-xl border-r border-white/[0.06] p-5 flex flex-col">
        {/* Logo */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-white">OpenMAIC · CSCA</p>
              <p className="text-xs text-zinc-500">{t.nav.tagline}</p>
            </div>
          </div>
        </div>

        {/* Agents Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            {t.nav.aiAssistant}
          </h2>
        </div>

        {/* Agents List */}
        <div className="space-y-2 flex-1 overflow-y-auto">
          {CSCA_AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleAgentMention(agent.id)}
              className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-lg"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white group-hover:text-zinc-100">
                    {agent.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {agent.role}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
          <CscaLanguageSwitcher />
          <nav className="grid grid-cols-2 gap-2">
            <Link href="/csca" className="py-2.5 px-3 rounded-xl bg-white/[0.03] text-zinc-400 text-xs font-medium text-center hover:text-white hover:bg-white/[0.08] transition-colors">
              {t.nav.prepCenter}
            </Link>
            <Link href="/" className="py-2.5 px-3 rounded-xl bg-white/[0.03] text-zinc-400 text-xs font-medium text-center hover:text-white hover:bg-white/[0.08] transition-colors">
              {t.nav.home}
            </Link>
          </nav>
          <div className="text-xs text-zinc-600 text-center pt-2">
            Tip: @mention an agent to talk directly!
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="relative flex-1 flex flex-col">
        {/* Header */}
        <div className="relative h-16 bg-zinc-900/50 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {CSCA_AGENTS.slice(0, 4).map((agent) => (
                <div
                  key={agent.id}
                  className="w-9 h-9 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
              ))}
              {CSCA_AGENTS.length > 4 && (
                <div className="w-9 h-9 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-white">
                  +{CSCA_AGENTS.length - 4}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                CSCA Prep Team
              </h2>
              <p className="text-xs text-zinc-500">
                {CSCA_AGENTS.length} agents ready to assist
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && message.agentId && (
                <div className="flex flex-col items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md"
                    style={{
                      backgroundColor: getAgentById(message.agentId)
                        ?.color || '#6366f1',
                    }}
                  >
                    {getAgentById(message.agentId)?.name.charAt(0) || 'S'}
                  </div>
                  <div className="text-[10px] text-zinc-600 mt-1">
                    {getAgentById(message.agentId)?.name.split(' ')[0] ||
                      'System'}
                  </div>
                </div>
              )}

              <div
                className={`max-w-[65%] px-4 py-3.5 rounded-2xl ${message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg'
                  : 'bg-white/[0.05] text-zinc-100 rounded-tl-sm border border-white/[0.06]'
                  }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <div className="text-[10px] text-zinc-500 mt-1.5">
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold">
                  You
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:.15s]" />
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:.3s]" />
                </div>
              </div>
              <div className="bg-white/[0.05] px-4 py-3.5 rounded-2xl rounded-tl-sm border border-white/[0.06]">
                <div className="text-sm text-zinc-400">
                  Agents are thinking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative p-4 bg-zinc-900/50 backdrop-blur-sm border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about exam prep, @mention an agent..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            <div className="flex gap-2 mt-3 justify-center">
              {CSCA_AGENTS.slice(0, 3).map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAgentMention(agent.id)}
                  className="px-3 py-1.5 text-xs bg-white/[0.03] text-zinc-400 rounded-full hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  @{agent.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
