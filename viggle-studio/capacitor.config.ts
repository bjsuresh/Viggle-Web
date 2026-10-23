import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.viggle.studio',
  appName: 'Viggle Studio',
  webDir: 'www',
  backgroundColor: '#0a0a12',
  server: {
    // Allows http://<LAN-IP>:3000 backends while developing. Use https in production.
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a12',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a12',
  },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0a0a12', overlaysWebView: false },
    Keyboard: { resize: 'body' },
  },
};

export default config;
