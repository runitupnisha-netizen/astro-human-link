import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitupmedia.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    // WKWebView honors the viewport meta in index.html
    // (maximum-scale=5, user-scalable=yes), so pinch-to-zoom is enabled
    // on device. No extra config required.
    scrollEnabled: true,
  },
};

export default config;
