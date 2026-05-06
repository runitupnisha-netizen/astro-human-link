import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitupmedia.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
