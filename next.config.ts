import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [],
  serverExternalPackages: [
    // Native dependencies (largest packages)
    '@napi-rs/canvas',
    'sharp',
    // Office/PDF processing
    'pptxgenjs',
    'pptxtojson',
    'unpdf',
    'pdf-parse',
    // Large visualization
    'echarts',
    '@xyflow/react',
    // Large text processing
    'shiki',
  ],
  compress: true,
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  async headers() {
    const extraAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();
    const frameAncestors = extraAncestors ? `'self' ${extraAncestors}` : "'self'";

    return [
      {
        source: '/(.*)',
        headers: [
          ...(!extraAncestors ? [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] : []),
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/(.*).(png|jpg|jpeg|gif|svg|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
