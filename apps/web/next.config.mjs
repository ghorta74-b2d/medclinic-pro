/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['medclinic-shared', '@vercel/analytics'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/landing2', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
