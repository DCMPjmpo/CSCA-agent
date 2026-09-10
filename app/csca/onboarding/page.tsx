'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, GraduationCap, BookOpen, CheckCircle2, ArrowRight,
  ArrowLeft, Compass, Sparkles,
} from 'lucide-react';
import { BrandShell } from '@/components/brand/BrandShell';
import { useTranslation } from '@/lib/i18n/hooks';
import { saveCscaSession } from '@/lib/csca/session';
import { ASEAN_COUNTRIES } from '@/lib/csca/asean-countries';
import { UNIVERSITIES } from '@/lib/csca/university-database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];
const EDUCATION_SYSTEMS = [
  { id: 'high_school', labelZh: '高中', labelEn: 'High School' },
  { id: 'undergraduate', labelZh: '本科在读', labelEn: 'Undergraduate' },
  { id: 'graduate', labelZh: '研究生申请', labelEn: 'Graduate Applicant' },
];

export default function OnboardingPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const isZh = locale.startsWith('zh');
  const o = (t as any).onboarding || {};

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<string>('');
  const [hsk, setHsk] = useState<number | ''>('');
  const [major, setMajor] = useState<string>('');
  const [education, setEducation] = useState<string>('');

  const majors = useMemo(() => {
    const set = new Set<string>();
    UNIVERSITIES.forEach(u => u.majors.forEach(m => set.add(m)));
    return Array.from(set).sort();
  }, []);

  const recommendedHsk = useMemo(() => {
    const c = ASEAN_COUNTRIES.find(x => x.code === country);
    return c?.hskRequirement ?? null;
  }, [country]);

  const totalSteps = 4;
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return !!country;
      case 1: return typeof hsk === 'number';
      case 2: return !!major;
      case 3: return !!education;
      default: return false;
    }
  }, [step, country, hsk, major, education]);

  const handleFinish = () => {
    saveCscaSession({
      selectedCountryCode: country,
      hskLevel: typeof hsk === 'number' ? hsk : undefined,
      targetMajorId: major,
      locale,
      currentStep: 'diagnosis',
      activeStep: 0,
    });
    router.push('/csca');
  };

  const handleSkip = () => {
    router.push('/csca/voyage');
  };

  const stepIcons = [
    <Globe key="0" className="h-5 w-5" />,
    <BookOpen key="1" className="h-5 w-5" />,
    <GraduationCap key="2" className="h-5 w-5" />,
    <Sparkles key="3" className="h-5 w-5" />,
  ];

  const stepLabels = isZh
    ? ['国家', '汉语水平', '目标专业', '教育背景']
    : ['Country', 'Chinese Level', 'Target Major', 'Education'];

  return (
    <BrandShell>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="border-b border-[var(--border)] bg-[var(--card)]">
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
              {isZh ? 'CSCA 学习航海' : 'CSCA Learning Voyage'}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{o.title || 'Welcome to CSCA'}</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {o.welcome || 'Tell us about yourself to personalize your learning voyage'}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="mb-8 flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                    i === step
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : i < step
                        ? 'border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]'
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={cn('h-px w-8', i < step ? 'bg-[var(--status-success)]' : 'bg-[var(--border)]')} />
                )}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="mb-6 rounded-lg border border-[var(--muted-gold)]/30 bg-[var(--status-warning-bg)] px-4 py-3">
              <p className="text-xs leading-relaxed text-[var(--gold-ink)]">
                {o.englishFirstHint || 'All learning content is in English. The CSCA exam is bilingual (Chinese/English).'}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <span className="text-[var(--primary)]">{stepIcons[step]}</span>
              <h2 className="text-lg font-semibold">
                {step === 0 && (o.step1Country || 'Your Country')}
                {step === 1 && (o.step2Hsk || 'HSK Level')}
                {step === 2 && (o.step3Major || 'Target Major')}
                {step === 3 && (o.step4Education || 'Education System')}
              </h2>
            </div>

            {step === 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ASEAN_COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      country === c.code
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    )}
                  >
                    <p className="text-sm font-medium">{isZh ? c.name : c.nameEn}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {c.code} - HSK {c.hskRequirement}+
                    </p>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div>
                {recommendedHsk !== null && (
                  <p className="mb-4 rounded-lg bg-[var(--muted)]/50 px-3 py-2 text-xs text-[var(--muted-foreground)]">
                    {isZh
                      ? `根据您选择的国家，建议 HSK ${recommendedHsk} 及以上`
                      : `Based on your country, HSK ${recommendedHsk} or above is recommended`}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {HSK_LEVELS.map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setHsk(lvl)}
                      className={cn(
                        'rounded-lg border p-3 text-center text-sm font-medium transition-colors',
                        hsk === lvl
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                          : 'border-[var(--border)] hover:bg-[var(--muted)]'
                      )}
                    >
                      HSK {lvl}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                  {isZh
                    ? 'HSK（汉语水平考试）共 6 级，6 级为最高。'
                    : 'HSK (Hanyu Shuiping Kaoshi) has 6 levels; level 6 is the highest.'}
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {majors.map(m => (
                  <button
                    key={m}
                    onClick={() => setMajor(m)}
                    className={cn(
                      'rounded-lg border p-3 text-left text-sm transition-colors',
                      major === m
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                {EDUCATION_SYSTEMS.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setEducation(e.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors',
                      education === e.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]'
                    )}
                  >
                    <span className="text-sm font-medium">
                      {isZh ? e.labelZh : e.labelEn}
                    </span>
                    {education === e.id && <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  {isZh ? '上一步' : 'Back'}
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleSkip}>
                  {o.skipToVoyage || 'Skip - Explore freely'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">
                {step + 1} / {totalSteps}
              </span>
              {step < totalSteps - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed}>
                  {isZh ? '下一步' : 'Next'}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={!canProceed}>
                  <Compass className="mr-1.5 h-4 w-4" />
                  {o.start || 'Start Learning'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </BrandShell>
  );
}
