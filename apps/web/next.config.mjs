/** @type {import('next').NextConfig} */

// Security headers applied to all routes
const securityHeaders = [
  // Prevent clickjacking — no iframes from other origins
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-sniffing attacks
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Restrict referrer information sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Force HTTPS for 2 years, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Restrict browser feature access (microphone allowed for AI voice capture)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Scripts: own origin, Stripe, Google Tag Manager, Vercel analytics
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.googletagmanager.com https://va.vercel-scripts.com",
      // Styles: own origin + inline (Tailwind/shadcn use inline styles)
      "style-src 'self' 'unsafe-inline'",
      // Images: own origin, data URIs, HTTPS (Supabase Storage signed URLs), blobs
      "img-src 'self' data: https: blob:",
      // Fonts: own origin and data URIs
      "font-src 'self' data:",
      // API/WebSocket connections: own origin, Supabase, Stripe, backend API
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://medclinic-api.vercel.app",
      // Frames: Stripe Elements only
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      // No iframes of this app by anyone
      "frame-ancestors 'none'",
      // Form submissions only to own origin
      "form-action 'self'",
      // Base tag restricted to own origin
      "base-uri 'self'",
      // Upgrade HTTP to HTTPS automatically
      "upgrade-insecure-requests",
    ].join('; '),
  },
]

const nextConfig = {
  transpilePackages: ['medclinic-shared', '@vercel/analytics'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        // Only signed URLs — clinical files must never be served from public paths
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
  async redirects() {
    return [
      { source: '/landing2', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
