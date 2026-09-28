'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, GraduationCap, Send, Mic, Users, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { CSCA_AGENTS, getAgentById } from '@/lib/csca/agents';
import { useTranslation } from '@/lib/i18n/hooks';
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder';
import { BrandShell } from '@/components/brand/BrandShell';
import { Toaster } from '@/components/ui/sonner';
import { useCscaSession } from '@/lib/hooks/use-csca-session';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  timestamp: Date | number;
}

export default function CscaMultiAgentPage() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { progress } = useCscaSession();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t.common.welcome,
      agentId: 'system',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [flagsOpen, setFlagsOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [view, setView] = useState<'hall' | 'chat'>('hall');
  const { isRecording, isProcessing, startRecording, stopRecording } = useAudioRecorder({
    onTranscription: (text) => setInput((prev) => prev + (prev ? ' ' : '') + text),
    onError: (error) => console.error('Voice input error:', error),
  });

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

    const assistantMessageId = `${Date.now()}-assistant`;

    setMessages((prev) => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agentId: 'system',
      timestamp: Date.now(),
    }]);

    try {
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
          stream: true,
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

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;

          const dataMatch = event.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          try {
            const chunk = JSON.parse(dataMatch[1]);

            if (chunk.type === 'chunk') {
              setMessages((prev) => prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: chunk.data.fullContent, agentId: chunk.data.agentId }
                  : msg
              ));
            } else if (chunk.type === 'complete') {
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
      setMessages((prev) => prev.map((msg) =>
        msg.id === assistantMessageId
          ? { ...msg, content: 'Sorry, there was an error. Please try again.', agentId: 'system' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransmit = () => {
    if (!input.trim() || isLoading) return;
    setView('chat');
    handleSend();
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

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-[8px] border border-[color:var(--color-border)] bg-white/60 p-0.5">
      <button
        type="button"
        data-testid="view-hall"
        data-active={view === 'hall' ? 'true' : 'false'}
        onClick={() => setView('hall')}
        className={cn(
          'rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors',
          view === 'hall'
            ? 'bg-[color:var(--color-deep-ocean-700)] text-white'
            : 'text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-ink-900)]',
        )}
      >
        {locale?.startsWith('zh') ? '助手大厅' : 'Hall'}
      </button>
      <button
        type="button"
        data-testid="view-chat"
        data-active={view === 'chat' ? 'true' : 'false'}
        onClick={() => setView('chat')}
        className={cn(
          'rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors',
          view === 'chat'
            ? 'bg-[color:var(--color-deep-ocean-700)] text-white'
            : 'text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-ink-900)]',
        )}
      >
        {locale?.startsWith('zh') ? '对话' : 'Chat'}
      </button>
    </div>
  );

  if (!mounted) return (
    <BrandShell>
      <div className="brand-light flex items-center justify-center min-h-screen bg-[color:var(--background)]">
        <Loader2 className="w-6 h-6 animate-spin text-[color:var(--color-muted-foreground)]" />
      </div>
    </BrandShell>
  );

  const isZh = locale?.startsWith('zh');

  return (
    <BrandShell>
      <div className="brand-light flex flex-col min-h-screen bg-[color:var(--background)]">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--color-border)] bg-white/90 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-[color:var(--color-deep-ocean-700)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-sm font-semibold text-[color:var(--color-ink-900)]">
              {isZh ? 'AI 航海助手全景大厅' : 'AI Mate Hall'}
            </span>
          </div>
          {viewToggle}
          <span className="ml-auto text-[11px] text-[color:var(--color-muted-foreground)]">
            {CSCA_AGENTS.length} {isZh ? '位专家' : 'experts'}
          </span>
        </div>

        {view === 'hall' ? (
          <>
            {/* Hall View: Agent Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-8 md:px-8 md:py-12">
              <div className="max-w-4xl mx-auto">
                {/* Context Banner */}
                <div className="mb-8 p-4 rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-deep-ocean-700)]/[0.03]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-muted-gold)] mb-1">
                    {isZh ? 'AI MATE · 上下文' : 'AI MATE · CONTEXT'}
                  </p>
                  <p className="text-[13px] text-[color:var(--color-ink-700)] leading-[1.65]">
                    {isZh
                      ? `当前航程：${progress.completedCount}/${progress.totalStages} 阶段完成 · ${progress.progressPercent}%。AI 航海助手根据你的学习上下文提供个性化指导。`
                      : `Voyage: ${progress.completedCount}/${progress.totalStages} stages · ${progress.progressPercent}%. AI Mate provides contextual guidance based on your learning progress.`}
                  </p>
                </div>

                {/* Agent Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CSCA_AGENTS.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => { handleAgentMention(agent.id); setView('chat'); }}
                      className="group flex flex-col gap-3 p-5 rounded-[10px] border border-[color:var(--color-border)] bg-white hover:border-[color:var(--color-deep-ocean-700)]/40 hover:-translate-y-[1px] hover:shadow-[0_6px_18px_-14px_rgba(7,28,38,0.22)] transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-[8px] flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-semibold text-[color:var(--color-ink-900)] truncate">
                            {agent.name}
                          </p>
                          <p className="text-[11px] text-[color:var(--color-muted-foreground)] truncate">
                            {agent.role}
                          </p>
                        </div>
                      </div>
                      {agent.role && (
                        <p className="text-[12px] text-[color:var(--color-muted-foreground)] leading-[1.6] line-clamp-2">
                          {agent.role}
                        </p>
                      )}
                      <span className="text-[11px] text-[color:var(--color-muted-gold)] uppercase tracking-wide">
                        {isZh ? '点击对话' : 'Click to chat'} →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Bar */}
            <div className="sticky bottom-0 border-t border-[color:var(--color-border)] bg-white/90 backdrop-blur-sm px-5 py-3">
              <div className="max-w-4xl mx-auto flex items-center gap-2">
                <button
                  data-testid="conch-btn"
                  type="button"
                  data-recording={isRecording || undefined}
                  onClick={() => (isRecording ? stopRecording() : startRecording())}
                  disabled={isProcessing || isLoading}
                  aria-label={t.chat.voice}
                  className="w-9 h-9 rounded-[8px] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-deep-ocean-700)] hover:border-[color:var(--color-deep-ocean-700)]/40 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
                <input
                  data-testid="hall-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTransmit()}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={inputFocused ? t.chat.placeholderFocus : t.chat.placeholder}
                  disabled={isLoading}
                  className="flex-1 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--background)] text-[13px] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-muted-foreground)] focus:outline-none focus:border-[color:var(--color-deep-ocean-700)]/50 disabled:opacity-50"
                />
                <button
                  data-testid="hall-send"
                  type="button"
                  onClick={handleTransmit}
                  disabled={isLoading || !input.trim()}
                  className="h-9 px-4 rounded-[8px] bg-[color:var(--color-deep-ocean-700)] text-white text-[13px] font-medium hover:bg-[color:var(--color-deep-ocean-800)] disabled:opacity-50 transition-colors"
                >
                  {isZh ? '发送' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Sidebar */}
            <div className="w-full lg:w-52 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[color:var(--color-border)] bg-white/60 p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[color:var(--color-muted-gold)]" />
                <h2 className="text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                  {isZh ? '航海助手团队' : 'AI Mate Team'}
                </h2>
              </div>
              <div className="space-y-1.5 flex-1 overflow-y-auto">
                {CSCA_AGENTS.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleAgentMention(agent.id)}
                    className="w-full p-2.5 rounded-[8px] border border-transparent hover:border-[color:var(--color-border)] hover:bg-white transition-all group text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-[6px] flex items-center justify-center text-white font-semibold text-xs shrink-0"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-[color:var(--color-ink-900)] truncate group-hover:text-[color:var(--color-deep-ocean-700)]">
                          {agent.name}
                        </div>
                        <div className="text-[11px] text-[color:var(--color-muted-foreground)] truncate">
                          {agent.role}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-3 border-t border-[color:var(--color-border)]">
                <p className="text-[11px] text-[color:var(--color-muted-foreground)] text-center">
                  {isZh ? '@提及专家可直接对话' : '@mention to chat with expert'}
                </p>
              </div>
            </div>

            {/* Chat Area */}
            <div className="relative flex-1 flex flex-col min-h-0 min-w-0">
              {/* Chat Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[color:var(--color-border)] bg-white/60">
                <div className="flex items-center gap-2">
                  {viewToggle}
                  <div className="flex -space-x-1.5">
                    {CSCA_AGENTS.slice(0, 4).map((agent) => (
                      <div
                        key={agent.id}
                        className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="roster-btn"
                  onClick={() => setRosterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[color:var(--color-border)] text-[12px] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-ink-900)] hover:border-[color:var(--color-deep-ocean-700)]/40 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  {t.chat.roster}
                </button>
              </div>

              {/* Messages */}
              <div className="relative flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && message.agentId && (
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white font-semibold text-xs"
                          style={{
                            backgroundColor: getAgentById(message.agentId)?.color || '#6366f1',
                          }}
                        >
                          {getAgentById(message.agentId)?.name.charAt(0) || 'S'}
                        </div>
                        <div className="text-[10px] text-[color:var(--color-muted-foreground)] mt-0.5">
                          {getAgentById(message.agentId)?.name.split(' ')[0] || 'System'}
                        </div>
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[85%] px-4 py-3 rounded-[10px]',
                        message.role === 'user'
                          ? 'bg-[color:var(--color-deep-ocean-700)] text-white'
                          : 'bg-white border border-[color:var(--color-border)] text-[color:var(--color-ink-900)]',
                      )}
                    >
                      <p className="text-[13px] leading-[1.65] whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <div className="text-[10px] text-[color:var(--color-muted-foreground)] mt-1.5">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-9 h-9 rounded-[8px] bg-[color:var(--color-muted)] flex items-center justify-center text-[color:var(--color-muted-foreground)] font-semibold text-xs shrink-0">
                        You
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-9 h-9 rounded-[8px] bg-[color:var(--color-deep-ocean-700)]/20 flex items-center justify-center">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[color:var(--color-muted-foreground)] rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-[color:var(--color-muted-foreground)] rounded-full animate-bounce [animation-delay:.15s]" />
                        <div className="w-1.5 h-1.5 bg-[color:var(--color-muted-foreground)] rounded-full animate-bounce [animation-delay:.3s]" />
                      </div>
                    </div>
                    <div className="bg-white border border-[color:var(--color-border)] px-4 py-3 rounded-[10px]">
                      <div className="text-[13px] text-[color:var(--color-muted-foreground)]">
                        {isZh ? 'AI 助手正在检索…' : 'AI Mate is searching…'}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-[color:var(--color-border)] bg-white/90 backdrop-blur-sm px-5 py-3">
                <div className="w-full">
                  {/* Quick Flags */}
                  <div className="flex flex-col items-center pb-2">
                    <button
                      data-testid="flags-toggle"
                      type="button"
                      aria-expanded={flagsOpen}
                      onClick={() => setFlagsOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-ink-900)] transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                      {t.chat.quickFlags}
                    </button>
                    {flagsOpen && (
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {[
                          { label: t.chat.quickDiagnose, onClick: () => router.push('/csca') },
                          { label: t.chat.quickClassroom, onClick: () => router.push('/#classroom-generator') },
                          { label: t.chat.quickProgress, onClick: () => router.push('/csca/voyage#study-plan') },
                          {
                            label: t.chat.quickTutor,
                            onClick: () => {
                              setInput((prev) => `${prev}@`);
                              inputRef.current?.focus();
                            },
                          },
                          { label: t.chat.quickMockExam, onClick: () => router.push('/csca/voyage#mock-exam') },
                        ].map((f) => (
                          <button
                            key={f.label}
                            data-testid="flag-chip"
                            type="button"
                            onClick={f.onClick}
                            className="px-2.5 py-1 rounded-[6px] border border-[color:var(--color-border)] text-[11px] text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-deep-ocean-700)] hover:border-[color:var(--color-deep-ocean-700)]/40 transition-colors"
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      data-testid="conch-btn"
                      type="button"
                      data-recording={isRecording || undefined}
                      onClick={() => (isRecording ? stopRecording() : startRecording())}
                      disabled={isProcessing || isLoading}
                      aria-label={t.chat.voice}
                      className="w-9 h-9 rounded-[8px] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-deep-ocean-700)] hover:border-[color:var(--color-deep-ocean-700)]/40 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      data-testid="desk-input"
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      placeholder={inputFocused ? t.chat.placeholderFocus : t.chat.placeholder}
                      disabled={isLoading}
                      className="flex-1 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--background)] text-[13px] text-[color:var(--color-ink-900)] placeholder:text-[color:var(--color-muted-foreground)] focus:outline-none focus:border-[color:var(--color-deep-ocean-700)]/50 disabled:opacity-50"
                    />
                    <button
                      data-testid="seal-send"
                      type="button"
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                      className="h-9 px-4 rounded-[8px] bg-[color:var(--color-deep-ocean-700)] text-white text-[13px] font-medium hover:bg-[color:var(--color-deep-ocean-800)] disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {t.chat.send}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Roster Drawer */}
      {rosterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setRosterOpen(false)} />
          <div className="relative w-full max-w-xs bg-white border-l border-[color:var(--color-border)] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[color:var(--color-ink-900)]">
                {t.chat.roster}
              </h3>
              <button
                type="button"
                onClick={() => setRosterOpen(false)}
                className="text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-ink-900)] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {CSCA_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    handleAgentMention(agent.id);
                    setRosterOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[8px] border border-[color:var(--color-border)] px-3 py-2.5 text-left transition-colors hover:border-[color:var(--color-deep-ocean-700)]/40 hover:bg-[color:var(--color-deep-ocean-700)]/[0.03]"
                >
                  <span
                    className="w-8 h-8 rounded-[6px] flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[color:var(--color-ink-900)]">{agent.name}</span>
                    <span className="block truncate text-[11px] text-[color:var(--color-muted-foreground)]">{agent.role}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <Toaster position="top-center" theme="light" />
      </div>
    </BrandShell>
  );
}
