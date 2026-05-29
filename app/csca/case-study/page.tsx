'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Target, Brain, Award, TrendingUp, GraduationCap, ChevronRight, CheckCircle, Star, User } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { CscaLanguageSwitcher } from '@/components/csca/CscaLanguageSwitcher';

const testimonials = [
  {
    name: 'Siriwat',
    country: '泰国',
    age: 17,
    avatar: 'S',
    quote: '通过CSCA备考系统，我的数学成绩从65分提升到了85分！AI讲解功能帮助我理解了很多以前不懂的概念。',
    scoreImprovement: '+20分'
  },
  {
    name: 'Nguyen',
    country: '越南',
    age: 18,
    avatar: 'N',
    quote: '智能诊断功能让我清楚地知道自己的薄弱环节在哪里，学习计划非常个性化，很适合我这样的国际学生。',
    scoreImprovement: '+15分'
  },
  {
    name: 'Dewi',
    country: '印尼',
    age: 16,
    avatar: 'D',
    quote: '多语言支持对我帮助很大，可以用母语学习中文课程。错题复习功能让我进步很快！',
    scoreImprovement: '+18分'
  }
];

const features = [
  {
    icon: Brain,
    title: '智能学情诊断',
    description: '基于AI的学习状态分析，精准定位薄弱环节',
    stats: '准确率95%'
  },
  {
    icon: Target,
    title: '考点自适应学习',
    description: '根据你的水平动态调整题目难度',
    stats: '个性化路径'
  },
  {
    icon: BookOpen,
    title: '专项模考训练',
    description: '模拟真实考试环境，提升应试能力',
    stats: '1000+题库'
  },
  {
    icon: TrendingUp,
    title: '成绩深度分析',
    description: '全面的成绩报告和趋势分析',
    stats: '可视化报告'
  },
  {
    icon: GraduationCap,
    title: '院校精准匹配',
    description: '根据成绩推荐适合的中国大学',
    stats: '500+院校'
  },
  {
    icon: Award,
    title: '奖学金评估',
    description: '评估奖学金申请可能性',
    stats: '成功率预测'
  }
];

const successStory = {
  studentName: '阿努查（Anucha）',
  country: '泰国曼谷',
  school: '曼谷国际学校',
  beforeScore: 58,
  afterScore: 82,
  improvement: '+24分',
  duration: '3个月',
  subjects: ['数学', '物理', '中文'],
  story: '阿努查是来自泰国曼谷的一名高中生，梦想是到中国顶尖大学学习工程专业。然而，CSCA考试的难度让他感到压力巨大。',
  challenges: '语言障碍、知识体系差异、备考资源匮乏',
  solution: '通过CSCA备考系统的多语言支持、AI智能辅导和个性化学习计划，阿努查克服了重重困难。',
  results: '在三个月内，阿努查的综合成绩从58分提升到82分，成功获得了上海交通大学的录取通知书！'
};

export default function CaseStudyPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const nav = t.nav;
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const storyByLocale: Record<string, typeof successStory> = {
    zh: {
      ...successStory,
      story: '阿努查是来自泰国曼谷的高中生，梦想进入中国顶尖大学学习工科，但 CSCA 考试的难度曾让他倍感压力。',
      challenges: '语言障碍、课程体系差异、备考资源有限',
      solution: '借助 CSCA 系统的多语言支持、AI 智能辅导与个性化学习计划，他逐步攻克了这些难题。',
      results: '三个月内，综合成绩从 58 分提升至 82 分，并收到上海交通大学录取通知！',
    },
    th: {
      ...successStory,
      story: 'อนุชาเป็นนักเรียนมัธยมจากกรุงเทพฯ ที่มีความฝันเรียนวิศวกรรมที่มหาวิทยาลัยชั้นนำในจีน แต่ความยากของ CSCA ทำให้เขารู้สึกกดดัน',
      challenges: 'อุปสรรคด้านภาษา ความแตกต่างของหลักสูตร และทรัพยากรเตรียมสอบที่จำกัด',
      solution: 'ด้วยการสนับสนุนหลายภาษา AI ติวเตอร์ และแผนการเรียนรู้ส่วนบุคคลของระบบ CSCA อนุชาจึงเอาชนะความท้าทายได้',
      results: 'ภายใน 3 เดือน คะแนนรวมของอนุชาเพิ่มจาก 58 เป็น 82 และได้รับการตอบรับจาก Shanghai Jiao Tong University!',
    },
    en: {
      ...successStory,
      story: 'Anucha is a high school student from Bangkok who dreams of studying engineering at a top Chinese university, but found the CSCA exam overwhelming.',
      challenges: 'Language barriers, curriculum differences, and limited prep resources',
      solution: 'With multi-language support, AI tutoring, and personalized study plans from the CSCA system, Anucha overcame these challenges.',
      results: 'In three months, Anucha raised his composite score from 58 to 82 and received an offer from Shanghai Jiao Tong University!',
    },
    ms: {
      ...successStory,
      story: 'Anucha adalah pelajar sekolah menengah dari Bangkok yang bercita-cita belajar kejuruteraan di universiti China terkemuka, tetapi mendapati peperiksaan CSCA amat mencabar.',
      challenges: 'Halangan bahasa, perbezaan kurikulum, dan sumber persiapan yang terhad',
      solution: 'Dengan sokongan pelbagai bahasa, tutor AI, dan pelan belajar peribadi dari sistem CSCA, Anucha telah mengatasi cabaran ini.',
      results: 'Dalam tempoh tiga bulan, skor gabungan Anucha meningkat dari 58 ke 82 dan beliau menerima tawaran dari Shanghai Jiao Tong University!',
    },
    tl: {
      ...successStory,
      story: 'Si Anucha ay isang mag-aaral ng high school mula sa Bangkok na may pangarap na mag-aral ng engineering sa isang nangungunang unibersidad sa Tsina, ngunit nakita niya ang CSCA exam na napakahirap.',
      challenges: 'Mga hadlang sa wika, pagkakaiba sa kurikulum, at limitadong mga mapagkukunan sa paghahanda',
      solution: 'Sa tulong ng suportang multi-language, AI tutoring, at mga personalized na study plan mula sa CSCA system, nalampasan ni Anucha ang mga hamong ito.',
      results: 'Sa loob ng tatlong buwan, tumaas ang composite score ni Anucha mula 58 hanggang 82 at nakatanggap siya ng offer mula sa Shanghai Jiao Tong University!',
    },
  };
  const localizedStory = storyByLocale[locale] ?? storyByLocale.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{nav.prepCenter}</h1>
                <p className="text-xs text-slate-400">{nav.tagline}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CscaLanguageSwitcher />
              <Link
                href="/csca"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
              >
                {t.diagnosis.start}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 rounded-full mb-6">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-indigo-300">成功案例</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              东盟学生的CSCA成功之路
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              帮助来自泰国、越南、印尼等东盟国家的学生实现留学中国的梦想
            </p>
          </div>

          {/* Success Story Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl p-8 md:p-12 border border-indigo-700/30 mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{localizedStory.studentName}</h3>
                    <p className="text-slate-400">{localizedStory.country} | {localizedStory.school}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400">{localizedStory.improvement}</div>
                    <div className="text-sm text-slate-400">成绩提升</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-400">{localizedStory.afterScore}</div>
                    <div className="text-sm text-slate-400">最终成绩</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-amber-400">{localizedStory.duration}</div>
                    <div className="text-sm text-slate-400">备考周期</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {localizedStory.subjects.map(subject => (
                    <span key={subject} className="px-3 py-1 bg-indigo-600/30 text-indigo-300 rounded-full text-sm">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🎯</span>
                    <h4 className="font-semibold text-white">挑战</h4>
                  </div>
                  <p className="text-slate-300 text-sm">{localizedStory.challenges}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💡</span>
                    <h4 className="font-semibold text-white">解决方案</h4>
                  </div>
                  <p className="text-slate-300 text-sm">{localizedStory.solution}</p>
                </div>

                <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h4 className="font-semibold text-white">成就</h4>
                  </div>
                  <p className="text-green-200 text-sm">{localizedStory.results}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-white text-center mb-8">全链路备考功能</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 hover:border-indigo-500/50 transition-all hover:transform hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-400 mb-3">{feature.description}</p>
                  <span className="text-xs px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded">
                    {feature.stats}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="bg-slate-800/30 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-white text-center mb-8">学员心声</h3>
            <div className="relative">
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
                >
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="w-full flex-shrink-0 px-4">
                      <div className="bg-slate-700/50 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl font-bold text-white">{testimonial.avatar}</span>
                        </div>
                        <p className="text-white mb-4 italic">"{testimonial.quote}"</p>
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-lg font-semibold text-white">{testimonial.name}</span>
                          <span className="text-slate-400">{testimonial.country}</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-green-400 font-semibold">{testimonial.scoreImprovement}</span>
                          <span className="text-slate-500 text-sm ml-2">成绩提升</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all ${index === activeTestimonial
                      ? 'bg-indigo-500 w-8'
                      : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">开启你的CSCA备考之旅</h3>
            <p className="text-slate-400 mb-8">加入数千名东盟学生的成功行列</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/csca')}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-xl"
              >
                立即开始备考
              </button>
              <button
                onClick={() => router.push('/csca-multi-agent')}
                className="px-8 py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-all"
              >
                了解更多功能
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            CSCA Exam Prep - 专为东盟国家学生打造的备考平台
          </p>
        </div>
      </footer>
    </div>
  );
}