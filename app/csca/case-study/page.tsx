'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Target, BookOpen, TrendingUp, GraduationCap, Award, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { BrandShell } from '@/components/brand/BrandShell';

const testimonials = [
  {
    name: 'Siriwat',
    country: '泰国',
    countryColor: '#2E9E6F',
    avatar: 'S',
    quote: '通过CSCA备考系统，我的数学成绩从65分提升到了85分！AI讲解功能帮助我理解了很多以前不懂的概念。',
    scoreImprovement: '+20分'
  },
  {
    name: 'Nguyen',
    country: '越南',
    countryColor: '#B82222',
    avatar: 'N',
    quote: '智能诊断功能让我清楚地知道自己的薄弱环节在哪里，学习计划非常个性化，很适合我这样的国际学生。',
    scoreImprovement: '+15分'
  },
  {
    name: 'Dewi',
    country: '印尼',
    countryColor: '#1A9A9A',
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
  studentCn: '阿努查',
  studentEn: 'Anucha',
  country: '泰国曼谷',
  school: '曼谷国际学校',
  countryColor: '#2E9E6F',
  avatarChar: '阿',
  beforeScore: 58,
  afterScore: 82,
  improvement: '+24分',
  improvementNum: '+24',
  duration: '3个月',
  durationNum: '3',
  subjects: [
    { full: '数学', seal: '算' },
    { full: '物理', seal: '物' },
    { full: '中文', seal: '文' },
  ],
  story: '阿努查是来自泰国曼谷的一名高中生，梦想是到中国顶尖大学学习工程专业。然而，CSCA考试的难度让他感到压力巨大。',
  challenges: '语言障碍、知识体系差异、备考资源匮乏',
  solution: '通过CSCA备考系统的多语言支持、AI智能辅导和个性化学习计划，阿努查克服了重重困难。',
  results: '在三个月内，阿努查的综合成绩从58分提升到82分，成功获得了上海交通大学的录取通知书！'
};

export default function CaseStudyPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
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
    <BrandShell>
      <div className="brand-light min-h-screen bg-ricepaper text-ink">
        {/* 学习案例档案 · 居中角色档案 */}
            <section className="relative py-12 px-4">
                <div className="max-w-3xl mx-auto">

	            {/* 1. 标题区 */}
	            <div className="text-center mb-10">
	              <div className="inline-flex mb-6">
	                <span className="case-plaque">
	                  <span>★</span>
	                  <span>学习案例</span>
                </span>
              </div>
              <h2
                className="font-page-title text-ink mb-4"
                style={{
                  fontSize: '28px',
                  letterSpacing: '4px',
                  textShadow: '3px 3px 0 #8B6914',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                }}
              >
                东盟学生的CSCA成功之路
              </h2>
              <p
                className="mx-auto"
                style={{
                  fontSize: '18px',
                  color: '#8B6914',
                  lineHeight: 1.8,
                  maxWidth: '36rem',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                }}
              >
                帮助来自泰国、越南、印尼等东盟国家的学生实现留学中国的梦想
              </p>
            </div>

            {/* 2. 学生头像 + 姓名（居中角色档案） */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="case-avatar mb-4"
                style={{ background: localizedStory.countryColor }}
                aria-label={localizedStory.studentCn}
              >
                {localizedStory.avatarChar}
              </div>
              <div className="text-center">
                <div
                  style={{
                    fontSize: '24px',
                    fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                    fontWeight: 700,
                    color: '#3B1D0C',
                    lineHeight: 1.3,
                  }}
                >
                  {localizedStory.studentCn}
                  <span style={{ color: '#8B6914', margin: '0 0.5rem' }}>｜</span>
                  <span style={{ fontFamily: 'var(--font-brand-pixel)', fontSize: '14px' }}>
                    {localizedStory.studentEn}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    color: '#3B1D0C',
                    marginTop: '4px',
                    fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                  }}
                >
                  {localizedStory.country} · {localizedStory.school}
                </div>
              </div>
            </div>

            {/* 3. 三枚战功印章横排 */}
            <div className="flex items-start justify-center gap-6 mb-10 flex-wrap">
              {/* +24分：热带绿 */}
              <div
                className="case-merit-seal"
                style={{ background: '#2E9E6F', color: '#F5F0E6' }}
              >
                <span className="case-merit-number">+24</span>
                <span className="case-merit-label">提升</span>
              </div>
              {/* 82分：金箔黄（≥80 甲上） */}
              <div
                className="case-merit-seal"
                style={{ background: '#C4A574', color: '#3B1D0C' }}
              >
                <span className="case-merit-number">82</span>
                <span className="case-merit-label">通过</span>
              </div>
              {/* 3个月：孔雀蓝 */}
              <div
                className="case-merit-seal"
                style={{ background: '#1A9A9A', color: '#F5F0E6' }}
              >
                <span className="case-merit-number">3</span>
                <span className="case-merit-label">3 个月</span>
              </div>
            </div>

            {/* 4. 三段学习记录（挑战 / 学习方案 / 成长记录） */}
            <div className="space-y-5 mb-10">
              <div className="case-scroll-panel">
                <div className="case-scroll-body">
                  <h4 className="case-scroll-title">挑战</h4>
                  <p className="case-scroll-text">{localizedStory.challenges}</p>
                </div>
              </div>
              <div className="case-scroll-panel">
                <div className="case-scroll-body">
                  <h4 className="case-scroll-title">学习方案</h4>
                  <p className="case-scroll-text">{localizedStory.solution}</p>
                </div>
              </div>
              <div className="case-scroll-panel">
                <div className="case-scroll-body">
                  <h4 className="case-scroll-title">成长记录</h4>
                  <p
                    className="case-scroll-text"
                    style={{ wordBreak: 'break-word', overflow: 'visible' }}
                  >
                    {localizedStory.results}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. 学科通关印 */}
            <div className="flex flex-col items-center gap-3 mb-10">
              <div
                style={{
                  fontSize: '16px',
                  color: '#8B6914',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                  fontWeight: 700,
                }}
              >
                学科掌握
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {localizedStory.subjects.map((subject) => (
                  <span
                    key={subject.full}
                    className="case-subject-seal"
                    data-fullname={subject.full}
                    title={subject.full}
                  >
                    {subject.seal}
                  </span>
                ))}
              </div>
            </div>

            {/* 探明风向按钮（直角） */}
            <div className="text-center mb-12">
              <Link
                href="/csca"
                className="btn-brand-primary inline-flex items-center gap-2 px-6 py-3"
              >
                {t.diagnosis.start}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 全链路备考功能 */}
            <div className="mb-12">
              <h3
                className="text-center mb-6"
                style={{
                  fontSize: '22px',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                  fontWeight: 700,
                  color: '#3B1D0C',
                  textShadow: '2px 2px 0 #8B6914',
                }}
              >
                全链路备考功能
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="case-feature-card">
                    <div className="case-feature-icon">
                      <feature.icon className="w-5 h-5" />
                    </div>
                    <h4
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#3B1D0C',
                        marginBottom: '6px',
                        fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                      }}
                    >
                      {feature.title}
                    </h4>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#8B6914',
                        marginBottom: '10px',
                        lineHeight: 1.5,
                      }}
                    >
                      {feature.description}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#081B24',
                        border: '1px solid #A68B5B',
                        color: '#C4A574',
                        fontSize: '11px',
                        fontFamily: 'var(--font-brand-pixel)',
                      }}
                    >
                      {feature.stats}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 学员心声（直角） */}
            <div className="case-scroll-panel mb-12">
              <div className="case-scroll-body">
                <h3
                  className="text-center mb-6"
                  style={{
                    fontSize: '22px',
                    fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                    fontWeight: 700,
                    color: '#3B1D0C',
                  }}
                >
                  学员心声
                </h3>
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
                  >
                    {testimonials.map((testimonial, index) => (
                      <div key={index} className="w-full flex-shrink-0 px-2">
                        <div className="case-voice-card">
                          <div
                            className="case-voice-avatar"
                            style={{ background: testimonial.countryColor }}
                          >
                            {testimonial.avatar}
                          </div>
                          <p
                            style={{
                              color: '#3B1D0C',
                              marginBottom: '12px',
                              fontStyle: 'italic',
                              fontSize: '15px',
                              lineHeight: 1.6,
                              fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                            }}
                          >
                            「{testimonial.quote}」
                          </p>
                          <div className="flex items-center justify-center gap-4">
                            <span
                              style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#3B1D0C',
                                fontFamily: 'var(--font-brand-pixel)',
                              }}
                            >
                              {testimonial.name}
                            </span>
                            <span
                              style={{
                                fontSize: '13px',
                                color: '#8B6914',
                                fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                              }}
                            >
                              {testimonial.country}
                            </span>
                          </div>
                          <div className="mt-3">
                            <span
                              style={{
                                color: '#2E9E6F',
                                fontWeight: 700,
                                fontFamily: 'var(--font-brand-pixel)',
                              }}
                            >
                              {testimonial.scoreImprovement}
                            </span>
                            <span
                              style={{
                                color: '#8B6914',
                                fontSize: '13px',
                                marginLeft: '8px',
                              }}
                            >
                              成绩提升
                            </span>
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
                      className="case-dot"
                      data-active={index === activeTestimonial ? 'true' : 'false'}
                      aria-label={`学员心声 ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mb-8">
              <h3
                className="mb-4"
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#3B1D0C',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                  textShadow: '2px 2px 0 #8B6914',
                }}
              >
                开启你的CSCA备考之旅
              </h3>
              <p
                className="mb-8"
                style={{
                  color: '#8B6914',
                  fontSize: '16px',
                  fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
                }}
              >
                加入数千名东盟学生的成功行列
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/csca')}
                  className="btn-brand-primary px-8 py-4"
                >
                  {t.hero.cta}
                </button>
                <button
                  onClick={() => router.push('/csca-multi-agent')}
                  className="btn-brand-secondary px-8 py-4"
                >
                  了解更多功能
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-[#A68B5B] py-8 mt-8 bg-[#081B24]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p
              style={{
                color: '#C4A574',
                fontSize: '13px',
                fontFamily: '"Kaiti SC", "STKaiti", "KaiTi", serif',
              }}
            >
              CSCA 备考系统 · 专为东盟国家学生打造的备考平台
            </p>
          </div>
        </footer>
      </div>
    </BrandShell>
  );
}
