/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ifdiogpvobpewwnabwam.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Transpile ESM-only globe packages so Next.js bundler handles them correctly
  transpilePackages: ['globe.gl', 'three-globe', 'three-render-objects'],
}

module.exports = nextConfig
