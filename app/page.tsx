'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Map,
  Target,
  MessageSquare,
  BookOpen,
  ChevronRight,
  Sparkles,
  FileText,
  ArrowRight,
  CheckCircle2,
  Brain,
  BarChart3,
  BookMarked,
  Users,
  Lightbulb,
} from 'lucide-react';
import { CscaLanguageSwitcher } from '@/components/csca/CscaLanguageSwitcher';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LEARNING_STEPS = [
  {
    icon: Brain,
    step: 1,
    title: '诊断测试',
    description: '评估当前知识水平，定制学习路径',
    color: 'bg-blue-500',
    href: '/csca',
  },
  {
    icon: Map,
    step: 2,
    title: '知识图谱',
    description: '可视化知识点结构，发现薄弱环节',
    color: 'bg-green-500',
    href: '/csca#knowledge-map',
  },
  {
    icon: Target,
    step: 3,
    title: '自适应练习',
    description: '针对薄弱点推送个性化练习',
    color: 'bg-yellow-500',
    href: '/csca#adaptive-learning',
  },
  {
    icon: BookOpen,
    step: 4,
    title: '模拟考试',
    description: '全真模拟CSCA考试环境',
    color: 'bg-orange-500',
    href: '/csca#mock-exam',
  },
  {
    icon: BarChart3,
    step: 5,
    title: '成绩分析',
    description: '详细分析错题，生成改进方案',
    color: 'bg-purple-500',
    href: '/csca#score-analysis',
  },
  {
    icon: BookMarked,
    step: 6,
    title: '学习计划',
    description: '制定系统学习计划，跟踪进度',
    color: 'bg-pink-500',
    href: '/csca#study-plan',
  },
];

const AGENT_FEATURES = [
  {
    icon: Users,
    title: '多智能体辅导',
    description: '8个专业AI导师随时答疑解惑',
    href: '/csca-multi-agent',
  },
  {
    icon: Lightbulb,
    title: '智能课堂',
    description: '根据诊断结果定制专属课程',
    href: '#classroom-generator',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [requirement, setRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('HomePage locale:', locale, 'welcome:', t.common.welcome);

  const handleGenerateClassroom = async () => {
    if (!requirement.trim()) return;
    
    setIsSubmitting(true);
    
    const session = {
      sessionId: `session-${Date.now()}`,
      requirements: {
        requirement: requirement.trim(),
        webSearch: false,
      },
      pdfText: '',
      currentStep: 'generating',
      previewPhase: 'preparing' as const,
    };
    
    sessionStorage.setItem('generationSession', JSON.stringify(session));
    
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/generation-preview');
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15), transparent)',
        }}
      />

      <header className="relative border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">OpenMAIC · CSCA</p>
              <p className="text-xs text-zinc-500">来华留学备考平台</p>
            </div>
          </div>
          <CscaLanguageSwitcher />
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 py-16 md:py-24">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 mb-6 tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            CSCA 备考系统
          </p>
          <h1 className="text-3xl md:text-[2.5rem] font-semibold tracking-tight text-white mb-5 leading-tight">
            东盟留学生 CSCA 备考助手
          </h1>
          <p className="text-zinc-400 text-base max-w-lg mx-auto leading-relaxed mb-10">
            面向东盟十国留学生，一站式完成CSCA备考。AI驱动的个性化学习路径，助您顺利通过来华留学本科入学考试。
          </p>
          
          <Link
            href="/csca"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 text-sm font-semibold rounded-full hover:bg-zinc-100 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <CheckCircle2 className="w-5 h-5" />
            开始备考
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>

        {/* Learning Flow Section */}
        <section className="mb-20">
          <h2 className="text-xl font-semibold text-white text-center mb-10">备考学习流程</h2>
          
          <div className="relative">
            {/* Flow connector line */}
            <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-green-500 via-yellow-500 via-orange-500 via-purple-500 to-pink-500" />
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {LEARNING_STEPS.map((step, index) => (
                <Link
                  key={step.step}
                  href={step.href}
                  className="group relative"
                >
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.14] hover:bg-white/[0.05] transition-all h-full">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 mb-4 group-hover:scale-110 transition-transform">
                      <step.icon className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-6 h-6 rounded-full ${step.color} flex items-center justify-center text-xs font-bold text-white`}>
                        {step.step}
                      </span>
                      <h3 className="text-sm font-medium text-white">{step.title}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{step.description}</p>
                  </div>
                  
                  {/* Arrow connector */}
                  {index < LEARNING_STEPS.length - 1 && (
                    <div className="hidden md:flex absolute top-10 -right-3 z-10 w-6 h-6 bg-zinc-900 rounded-full items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {AGENT_FEATURES.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Classroom Generator Section */}
        <section id="classroom-generator" className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">智能课堂生成</h2>
          </div>
          <p className="text-zinc-400 mb-6">
            根据您的诊断结果和学习需求，AI将为您定制专属课程内容，包括幻灯片、测验、交互式模拟和项目制学习活动。
          </p>
          
          <textarea
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="输入您的学习需求，例如：生成一节针对泰国学生的CSCA数学备考课程..."
            className="w-full h-24 bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 resize-none mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleGenerateClassroom();
              }
            }}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Ctrl + Enter 快速生成</span>
            <Button
              onClick={handleGenerateClassroom}
              disabled={!requirement.trim() || isSubmitting}
              className={cn(
                'bg-indigo-600 hover:bg-indigo-700 text-white px-6',
                !requirement.trim() && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSubmitting ? '生成中...' : (
                <>
                  生成课堂
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Footer Links */}
        <section className="flex flex-wrap gap-2 justify-center mt-12">
          <Link
            href="/csca"
            className="px-4 py-2 rounded-full text-xs text-zinc-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-colors"
          >
            开始诊断
          </Link>
          <Link
            href="/csca-multi-agent"
            className="px-4 py-2 rounded-full text-xs text-zinc-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-colors inline-flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            AI导师咨询
          </Link>
          <Link
            href="/generation-preview"
            className="px-4 py-2 rounded-full text-xs text-zinc-400 border border-white/[0.08] hover:text-white hover:border-white/[0.15] transition-colors"
          >
            课堂生成
          </Link>
        </section>
      </main>
    </div>
  );
}
