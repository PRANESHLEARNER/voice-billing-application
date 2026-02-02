import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'my-v0-project',
  webDir: 'out',
  server: {
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
