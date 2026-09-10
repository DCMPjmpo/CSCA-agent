'use client';

import dynamic from 'next/dynamic';

// [PERF-FIX] Toaster (sonner) is code-split out of the shared first-screen bundle
// (~18KB gzip). The root layout is a Server Component, so next/dynamic with
// ssr:false must live behind this small client wrapper.
const Toaster = dynamic(() => import('@/components/ui/sonner').then((m) => m.Toaster), {
  ssr: false,
});

export { Toaster };
