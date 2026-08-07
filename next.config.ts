import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow Cloudinary images to be served via Next.js Image Optimization
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth profile photos
        pathname: "/**",
      },
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff"          },
          { key: "X-Frame-Options",         value: "DENY"             },
          { key: "X-XSS-Protection",        value: "1; mode=block"   },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "microphone=(self)" },
          // NOTE: Cross-Origin-Opener-Policy intentionally NOT set here.
          // COOP: same-origin breaks Firebase signInWithPopup — the OAuth popup
          // cannot call window.closed on the opener, so auth never completes.
        ],
      },
    ];
  },
  // Rewrite Firebase Auth handler to avoid 3rd-party cookie & domain issues
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://echo-aura.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
