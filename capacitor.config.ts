import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echo.app',
  appName: 'Echo',
  webDir: 'out',

  server: {
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
    cleartext: false,
  },

  android: {
    allowMixedContent:           false,
    webContentsDebuggingEnabled: false,
    backgroundColor:             '#000000',
  },

  ios: {
    backgroundColor: '#000000',
    contentInset:    'automatic',
    scrollEnabled:   true,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:         1200,
      backgroundColor:            '#000000',
      showSpinner:                false,
      androidSplashResourceName:  'splash',
      androidScaleType:           'CENTER_CROP',
    },

    Keyboard: {
      resize:             'body' as any,
      resizeOnFullScreen: true,
    },

    // Native Google Sign-In — shows device account picker on Android
    GoogleAuth: {
      scopes:                  ['profile', 'email'],
      serverClientId:          '29569599076-kco7vvdltgv52fjr92qbjq3a6og1321g.apps.googleusercontent.com',
      clientId:                '29569599076-kco7vvdltgv52fjr92qbjq3a6og1321g.apps.googleusercontent.com',
      androidClientId:         '29569599076-kco7vvdltgv52fjr92qbjq3a6og1321g.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    } as any,
  },
};

export default config;
