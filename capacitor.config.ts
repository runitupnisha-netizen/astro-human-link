import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitupmedia.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    // Allow pinch-to-zoom inside the iOS WKWebView so the viewport meta
    // (maximum-scale=5, user-scalable=yes) actually takes effect on device.
    // Apple's accessibility guidance: never lock zoom.
    limitsNavigationsToAppBoundDomains: false,
    scrollEnabled: true,
  },
  android: {
    // Mirror the iOS behavior on Android WebViews.
    allowMixedContent: false,
  },
};

export default config;
