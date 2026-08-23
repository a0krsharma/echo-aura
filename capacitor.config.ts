import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echo.app',
  appName: 'Echo',
  webDir: 'out',

  server: {
    // Live Production Endpoint for instant OTA updates without APK re-installs
    url: 'https://echo-aura.vercel.app',
    allowNavigation: [
      '*.firebaseapp.com',
      '*.firebase.google.com',
      '*.googleapis.com',
      '*.google.com',
      '*.googleusercontent.com',
      '*.gstatic.com',
      'accounts.google.com',
      'accounts.youtube.com',
      '*.cloudinary.com',
      'res.cloudinary.com',
      '*.agora.io',
      '*.edge.agora.io',
      '*.agoraio.cn',
      '*.spotify.com',
      'open.spotify.com',
      'echo-aura.vercel.app',
    ],
    cleartext: false,
  },

  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#000000',
    overrideUserAgent: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
};

export default config;
