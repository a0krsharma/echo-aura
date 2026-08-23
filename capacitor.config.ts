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
      'accounts.google.com',
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
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
};

export default config;
