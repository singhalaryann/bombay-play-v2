/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        // CHANGED: Route to ideationchat instead of dashboard
        destination: '/ideationchat',
        permanent: true,
      },
      // REMOVED: The redirect from ideationchat to dashboard since we want ideationchat to work
    ];
  },
};

export default nextConfig;