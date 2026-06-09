import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitupmedia.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    scrollEnabled: true,
    // WKWebView ignores user-scalable=yes by default — Apple disables pinch-zoom
    // inside WKWebView regardless of the viewport meta. Setting this flag tells
    // Capacitor to enable WKWebView's native zoom gesture so pinch-to-zoom works
    // on device. Layout already respects the in-app Text Size control, so this
    // is purely additive.
    webContentsDebuggingEnabled: false,
    limitsNavigationsToAppBoundDomains: false,
    // @ts-expect-error — supported by @capacitor/ios runtime; types lag behind.
    zoomEnabled: true,
  },
};

export default config;
