import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Noto_Serif_SC, Noto_Sans_Thai, Noto_Sans_Myanmar, Noto_Sans_Khmer, Noto_Sans_Lao } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { AccessCodeGuard } from '@/components/access-code-guard';
import { CscaI18nProvider } from '@/lib/i18n/csca-context';
import { SoundProvider } from '@/lib/brand/sound-context';

/* Batch 1 · Font system:
   Primary UI: Inter (self-hosted variable) → --font-sans (覆盖 GeistSans 作为默认 UI sans)
   Editorial titles (仅极少量 eyebrow / 品牌展示): Noto Serif SC → --font-brand-title
   Numbers / monospaced scores: Geist Mono → --font-geist-mono
   REMOVED: ZCOOL QingKe HuangYou (标题用游戏装饰字体), Press Start 2P (8-bit 像素字体)
   ASEAN language fonts retained for glyph coverage.
*/
const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
  display: 'swap',
});

const brandSerifTitle = Noto_Serif_SC({
  weight: ['500', '600', '700'],
  variable: '--font-brand-title',
  display: 'swap',
  subsets: ['latin'],
});

// 东盟十国语言字体（批次 18 · 保留）：泰文/缅文/高棉文/老挝文
const notoThai = Noto_Sans_Thai({
  weight: ['400', '500', '700'],
  variable: '--font-thai',
  display: 'swap',
  subsets: ['thai'],
});
const notoMyanmar = Noto_Sans_Myanmar({
  weight: ['400', '500', '700'],
  variable: '--font-myanmar',
  display: 'swap',
  subsets: ['myanmar'],
});
const notoKhmer = Noto_Sans_Khmer({
  weight: ['400', '500', '700'],
  variable: '--font-khmer',
  display: 'swap',
  subsets: ['khmer'],
});
const notoLao = Noto_Sans_Lao({
  weight: ['400', '500', '700'],
  variable: '--font-lao',
  display: 'swap',
  subsets: ['lao'],
});

export const metadata: Metadata = {
  title: 'CSCA — AI-Powered Premium Learning Platform',
  description:
    'CSCA Learning Voyage · 面向国际学生的 AI 驱动中国大学升学学习平台。航海隐喻：定位 → 航海图 → 演练 → 试航 → 观星 → 修正 → 航程 → 院校港口。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${brandSerifTitle.variable} ${notoThai.variable} ${notoMyanmar.variable} ${notoKhmer.variable} ${notoLao.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <I18nProvider>
            <AccessCodeGuard>
              <CscaI18nProvider>
                <SoundProvider>{children}</SoundProvider>
              </CscaI18nProvider>
            </AccessCodeGuard>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
