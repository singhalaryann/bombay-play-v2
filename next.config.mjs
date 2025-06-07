/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        // CHANGED: Route to dashboard instead of ideationchat
        destination: '/dashboard',
        permanent: true,
      },
      // REMOVED: The redirect from ideationchat to dashboard since we want ideationchat to work
    ];
  },
};

export default nextConfig;