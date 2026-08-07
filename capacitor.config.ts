import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echo.app',
  appName: 'Echo',
  webDir: 'out',

  server: {
    /**
     * allowNavigation: domains the WebView can navigate to without leaving the app.
     * Required for Firebase Auth popup flow, Cloudinary media, and Agora streams.
     */
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
    ],
    // Do not allow cleartext (http) traffic
    cleartext: false,
  },

  android: {
    /**
     * allowMixedContent: false — enforce HTTPS for all subresources.
     * webContentsDebuggingEnabled: false in production.
     */
    allowMixedContent:            false,
    webContentsDebuggingEnabled:  false,

    /**
     * backgroundColor: match app theme so no white flash on resume.
     */
    backgroundColor: '#000000',
  },

  ios: {
    backgroundColor: '#000000',
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor:    '#000000',
      showSpinner:        false,
      androidSplashResourceName: 'splash',
      androidScaleType:  'CENTER_CROP',
    },

    /**
     * Keyboard: push content up on keyboard open, essential for DM / whisper input.
     */
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
